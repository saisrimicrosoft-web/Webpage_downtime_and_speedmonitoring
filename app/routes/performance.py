import csv
import io
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from flask import Blueprint, render_template, jsonify, request, Response
from app.utils.time_utils import to_utc_iso

from sqlalchemy import func, and_, case, extract, cast, Integer
from app.models import db
from app.models.check import Check
from config import load_urls

performance_bp = Blueprint('performance', __name__)

# The limit above which a response is considered "slow"
SLOW_LIMIT_MS = 2000

@performance_bp.route('/performance')
def index():
    return render_template('performance.html')

def parse_range(range_str):
    now = datetime.now(timezone.utc)
    if range_str == '24h':
        return now - timedelta(hours=24), now
    elif range_str == '7d':
        return now - timedelta(days=7), now
    elif range_str == '30d':
        return now - timedelta(days=30), now
    raise ValueError("Invalid range")

def get_speed_class(ms):
    if ms is None:
        return 'offline'
    if ms < 500:
        return 'fast'
    if ms <= 1500:
        return 'ok'
    if ms <= 3000:
        return 'slow'
    return 'very-slow'

def percentile(N, percent, key=lambda x:x):
    """
    Find the percentile of a list of values.
    """
    if not N:
        return None
    k = (len(N)-1) * percent
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return key(N[int(k)])
    d0 = key(N[int(f)]) * (c-k)
    d1 = key(N[int(c)]) * (k-f)
    return d0+d1

@performance_bp.route('/api/performance/summary', methods=['GET'])
def summary():
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        
        urls = load_urls()
        if not urls:
            return jsonify({
                "score": 0, "label": "No data", "avg_ms": None, "avg_change_pct": None,
                "fastest": None, "slowest": None, "slow_pct": 0, "p95_ms": None,
                "sites_counted": 0, "sites_offline": 0
            })

        # Base filter
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url.in_(urls))
        
        # We only count response times for UP/DEGRADED checks
        up_filter = and_(Check.is_up == True, Check.response_ms != None)

        # 1. Fetch raw data to compute p95 and per-site averages
        checks = db.session.query(Check.url, Check.response_ms).filter(base_filter, up_filter).all()
        
        if not checks:
            return jsonify({
                "score": 0, "label": "Offline", "avg_ms": None, "avg_change_pct": None,
                "fastest": None, "slowest": None, "slow_pct": 0, "p95_ms": None,
                "sites_counted": len(urls), "sites_offline": len(urls)
            })

        response_times = [c.response_ms for c in checks]
        response_times.sort()
        p95_ms = int(percentile(response_times, 0.95))
        avg_ms = int(sum(response_times) / len(response_times))
        
        # Per site stats to find fastest and slowest
        site_times = defaultdict(list)
        for c in checks:
            site_times[c.url].append(c.response_ms)
            
        site_avgs = {url: sum(times)/len(times) for url, times in site_times.items()}
        
        fastest_url = min(site_avgs.items(), key=lambda x: x[1])
        slowest_url = max(site_avgs.items(), key=lambda x: x[1])
        
        fastest_name = fastest_url[0].replace('https://', '').replace('http://', '').split('/')[0]
        slowest_name = slowest_url[0].replace('https://', '').replace('http://', '').split('/')[0]
        
        slow_count = sum(1 for ms in response_times if ms > SLOW_LIMIT_MS)
        slow_pct = int((slow_count / len(response_times)) * 100)
        
        ok_count = sum(1 for ms in response_times if ms <= 1500)
        ok_pct = ok_count / len(response_times) # 0.0 to 1.0
        
        # Score calculation: 60% OK share, 40% p95 penalty
        # penalty: 0 if p95 <= 1500, else scales down to 0 at 5000
        p95_score = max(0, min(1, 1 - (p95_ms - 1500) / 3500)) if p95_ms > 1500 else 1.0
        score = int((ok_pct * 60) + (p95_score * 40))
        
        if score >= 80:
            label = "Fast"
        elif score >= 60:
            label = "Okay · room to improve"
        else:
            label = "Slow"
            
        sites_counted = len(site_avgs)
        sites_offline = len(urls) - sites_counted
        
        # Calculate prev avg
        prev_start = start - (end - start)
        prev_end = start
        prev_filter = and_(Check.checked_at >= prev_start, Check.checked_at <= prev_end, Check.url.in_(urls))
        prev_avg_res = db.session.query(func.avg(Check.response_ms)).filter(prev_filter, up_filter).scalar()
        
        avg_change_pct = None
        if prev_avg_res is not None and prev_avg_res > 0:
            avg_change_pct = int(((avg_ms - prev_avg_res) / prev_avg_res) * 100)
            
        return jsonify({
            "score": score,
            "label": label,
            "avg_ms": avg_ms,
            "avg_change_pct": avg_change_pct,
            "fastest": {"name": fastest_name, "ms": int(fastest_url[1])},
            "slowest": {"name": slowest_name, "ms": int(slowest_url[1])},
            "slow_pct": slow_pct,
            "p95_ms": p95_ms,
            "sites_counted": sites_counted,
            "sites_offline": sites_offline
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@performance_bp.route('/api/performance/terrain', methods=['GET'])
def terrain():
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        
        urls = load_urls()
        
        # Split the range into 48 buckets
        bucket_count = 48
        delta = (end - start).total_seconds() / bucket_count
        
        # For sqlite, we can compute bucket in python if data is small, 
        # or use sqlite expression: cast((strftime('%s', checked_at) - start) / delta as int)
        # However, to be safe across dialects, we just fetch all up checks and bucket in memory.
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url.in_(urls))
        up_filter = and_(Check.is_up == True, Check.response_ms != None)
        checks = db.session.query(Check.url, Check.checked_at, Check.response_ms).filter(base_filter, up_filter).all()
        
        # Also need to know if a site is totally offline
        site_has_data = defaultdict(bool)
        buckets = {url: defaultdict(list) for url in urls}
        
        start_ts = start.timestamp()
        
        for c in checks:
            site_has_data[c.url] = True
            b = min(bucket_count - 1, int((c.checked_at.timestamp() - start_ts) / delta))
            buckets[c.url][b].append(c.response_ms)
            
        result = []
        for url in urls:
            name = url.replace('https://', '').replace('http://', '').split('/')[0]
            if not site_has_data[url]:
                result.append({
                    "website_id": url,
                    "name": name,
                    "status": "offline",
                    "class": "offline",
                    "points": []
                })
                continue
                
            points = []
            all_times_for_site = []
            for b in range(bucket_count):
                bucket_start = start + timedelta(seconds=b*delta)
                times = buckets[url][b]
                if times:
                    avg_ms = sum(times)/len(times)
                    max_ms = max(times)
                    points.append({"t": to_utc_iso(bucket_start), "avg_ms": int(avg_ms), "max_ms": max_ms})
                    all_times_for_site.extend(times)
                else:
                    points.append({"t": to_utc_iso(bucket_start), "avg_ms": None, "max_ms": None})
                    
            overall_avg = sum(all_times_for_site)/len(all_times_for_site)
            cls = get_speed_class(overall_avg)
            
            result.append({
                "website_id": url,
                "name": name,
                "status": "online",
                "class": cls,
                "points": points
            })
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@performance_bp.route('/api/performance/lanes', methods=['GET'])
def lanes():
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        urls = load_urls()
        
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url.in_(urls))
        up_filter = and_(Check.is_up == True, Check.response_ms != None)
        
        # SQLAlchemy 2.0 query for averages
        results = db.session.query(
            Check.url,
            func.avg(Check.response_ms).label('avg_ms')
        ).filter(base_filter, up_filter).group_by(Check.url).all()
        
        avg_map = {r.url: r.avg_ms for r in results if r.avg_ms is not None}
        
        lanes_data = []
        for url in urls:
            name = url.replace('https://', '').replace('http://', '').split('/')[0]
            avg_ms = avg_map.get(url)
            if avg_ms is None:
                lanes_data.append({
                    "website_id": url,
                    "name": name,
                    "avg_ms": None,
                    "class": "offline",
                    "status": "offline"
                })
            else:
                lanes_data.append({
                    "website_id": url,
                    "name": name,
                    "avg_ms": int(avg_ms),
                    "class": get_speed_class(avg_ms),
                    "status": "online"
                })
                
        # Sort: fast to slow, offline at end
        lanes_data.sort(key=lambda x: (x['avg_ms'] is None, x['avg_ms']))
        
        return jsonify(lanes_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@performance_bp.route('/api/performance/heatmap', methods=['GET'])
def heatmap():
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        urls = load_urls()
        
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url.in_(urls))
        up_filter = and_(Check.is_up == True, Check.response_ms != None)
        
        # We need hour of day in user's timezone.
        # But we only know UTC in the backend unless the frontend passes a timezone offset.
        # A simple approach: frontend renders it based on local time.
        # But to group by 2-hour buckets across the range, it's easier to bucket in python.
        # If we bucket in python, we should group by UTC hour, then the frontend shifts it?
        # Actually, if we just pass all data points, it's too much data.
        # Let's extract hour of day in UTC using sqlite `strftime('%H', checked_at)`.
        
        # Alternatively, the prompt says "12 two-hour buckets of the day (0-22)".
        # Let's accept an optional tz_offset parameter (minutes).
        tz_offset_min = request.args.get('tz_offset', 0, type=int)
        
        checks = db.session.query(Check.url, Check.checked_at, Check.response_ms).filter(base_filter, up_filter).all()
        
        # Group into 12 buckets
        buckets = {url: {b: [] for b in range(12)} for url in urls}
        
        for c in checks:
            # Shift to local time
            local_dt = c.checked_at + timedelta(minutes=tz_offset_min)
            hour = local_dt.hour
            b = hour // 2
            buckets[c.url][b].append(c.response_ms)
            
        result = []
        for url in urls:
            name = url.replace('https://', '').replace('http://', '').split('/')[0]
            cells = []
            for b in range(12):
                times = buckets[url][b]
                if times:
                    avg_ms = sum(times)/len(times)
                    # levels 0-4 mapping
                    if avg_ms < 500: lvl = 0
                    elif avg_ms < 1000: lvl = 1
                    elif avg_ms < 1500: lvl = 2
                    elif avg_ms < 3000: lvl = 3
                    else: lvl = 4
                    cells.append({"hour_start": b*2, "avg_ms": int(avg_ms), "level": lvl})
                else:
                    cells.append({"hour_start": b*2, "avg_ms": None, "level": None})
            
            result.append({
                "website_id": url,
                "name": name,
                "cells": cells
            })
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@performance_bp.route('/api/performance/insights', methods=['GET'])
def insights():
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        urls = load_urls()
        
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url.in_(urls))
        up_filter = and_(Check.is_up == True, Check.response_ms != None)
        
        checks = db.session.query(Check.url, Check.checked_at, Check.response_ms).filter(base_filter, up_filter).all()
        
        site_times = defaultdict(list)
        buckets = {url: {b: [] for b in range(12)} for url in urls}
        
        for c in checks:
            site_times[c.url].append(c.response_ms)
            b = c.checked_at.hour // 2
            buckets[c.url][b].append(c.response_ms)
            
        site_avgs = {url: sum(times)/len(times) for url, times in site_times.items()}
        offline_sites = [url for url in urls if url not in site_avgs]
        
        cards = []
        
        if site_avgs:
            fastest_url = min(site_avgs.items(), key=lambda x: x[1])
            slowest_url = max(site_avgs.items(), key=lambda x: x[1])
            fastest_name = fastest_url[0].replace('https://', '').replace('http://', '').split('/')[0]
            slowest_name = slowest_url[0].replace('https://', '').replace('http://', '').split('/')[0]
            
            # Find worst 2-hour window for slowest site
            slowest_buckets = buckets[slowest_url[0]]
            worst_bucket = -1
            worst_avg = -1
            for b, times in slowest_buckets.items():
                if times:
                    avg = sum(times)/len(times)
                    if avg > worst_avg:
                        worst_avg = avg
                        worst_bucket = b
            
            if worst_bucket != -1:
                multiple = round(worst_avg / fastest_url[1], 1) if fastest_url[1] > 0 else 0
                h_start = worst_bucket * 2
                h_end = h_start + 2
                cards.append({
                    "text": f"The slowest site is {slowest_name}. Its worst window is between {h_start:02d}:00 and {h_end:02d}:00 UTC, when it runs {multiple}x slower than {fastest_name}."
                })
            
            # Sites under 500ms
            fast_sites = [url.replace('https://', '').replace('http://', '').split('/')[0] for url, avg in site_avgs.items() if avg < 500]
            if fast_sites:
                if len(fast_sites) > 3:
                    names = ", ".join(fast_sites[:3]) + f" and {len(fast_sites)-3} others"
                else:
                    names = ", ".join(fast_sites)
                cards.append({
                    "text": f"{names} stayed under 500ms on average this period. Great job!"
                })
                
        if offline_sites:
            if len(offline_sites) > 3:
                names = ", ".join([u.replace('https://', '').replace('http://', '').split('/')[0] for u in offline_sites[:3]]) + f" and {len(offline_sites)-3} others"
            else:
                names = ", ".join([u.replace('https://', '').replace('http://', '').split('/')[0] for u in offline_sites])
            cards.append({
                "text": f"{names} could not be measured because they are offline."
            })
            
        return jsonify(cards[:3])
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@performance_bp.route('/api/performance/site/<path:url>', methods=['GET'])
def site_details(url):
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url == url)
        
        # Up checks for stats
        up_filter = and_(Check.is_up == True, Check.response_ms != None)
        up_checks = db.session.query(Check.response_ms).filter(base_filter, up_filter).all()
        
        response_times = [c.response_ms for c in up_checks]
        
        if not response_times:
            stats = {"min": None, "avg": None, "p95": None, "max": None}
            chart_data = []
        else:
            response_times.sort()
            stats = {
                "min": response_times[0],
                "avg": int(sum(response_times)/len(response_times)),
                "p95": int(percentile(response_times, 0.95)),
                "max": response_times[-1]
            }
            
            # Chart data (up to 100 points to avoid overloading)
            points = db.session.query(Check.checked_at, Check.response_ms).filter(base_filter, up_filter).order_by(Check.checked_at).all()
            step = max(1, len(points)//100)
            chart_data = [{"t": to_utc_iso(p.checked_at), "ms": p.response_ms} for p in points[::step]]
            
        # Recent checks
        recent = db.session.query(Check).filter(Check.url == url).order_by(Check.checked_at.desc()).limit(20).all()
        recent_list = [{
            "t": to_utc_iso(c.checked_at),
            "status": "UP" if c.is_up else "DOWN",
            "ms": c.response_ms,
            "http_code": c.status_code,
            "error": None if c.is_up else "Failed"
        } for c in recent]
        
        name = url.replace('https://', '').replace('http://', '').split('/')[0]
        return jsonify({
            "name": name,
            "url": url,
            "stats": stats,
            "chart_data": chart_data,
            "recent_checks": recent_list
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@performance_bp.route('/api/performance/export', methods=['GET'])
def export_csv():
    try:
        r = request.args.get('time_range', '7d')
        start, end = parse_range(r)
        urls = load_urls()
        
        base_filter = and_(Check.checked_at >= start, Check.checked_at <= end, Check.url.in_(urls))
        up_filter = and_(Check.is_up == True, Check.response_ms != None)
        
        results = db.session.query(
            Check.url,
            func.avg(Check.response_ms).label('avg_ms'),
            func.count(Check.id).label('count')
        ).filter(base_filter, up_filter).group_by(Check.url).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Website', 'URL', 'Average Response Time (ms)', 'Successful Checks in Range'])
        
        for r in results:
            name = r.url.replace('https://', '').replace('http://', '').split('/')[0]
            writer.writerow([name, r.url, int(r.avg_ms) if r.avg_ms else '', r.count])
            
        return Response(output.getvalue(), mimetype='text/csv',
                        headers={'Content-Disposition': f'attachment; filename="performance_export_{r}.csv"'})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
