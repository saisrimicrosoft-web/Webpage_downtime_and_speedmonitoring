import pytest
from unittest.mock import patch, MagicMock
from app.services.supabase_service import SupabaseService
from app.models.check import Check
from config import Config

def test_supabase_not_configured():
    with patch.object(Config, 'SUPABASE_URL', ''), patch.object(Config, 'SUPABASE_KEY', ''):
        assert SupabaseService.is_configured() is False
        check = Check(url="https://example.com", is_up=True)
        assert SupabaseService.send_check(check) is False

def test_supabase_send_check_success():
    with patch.object(Config, 'SUPABASE_URL', 'https://test.supabase.co'), \
         patch.object(Config, 'SUPABASE_KEY', 'testkey'), \
         patch('requests.post') as mock_post:
        
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        check = Check(url="https://example.com", status_code=200, response_ms=120, is_up=True, ssl_days_left=90)
        result = SupabaseService.send_check(check)
        
        assert result is True
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs['json']['url'] == "https://example.com"
        assert kwargs['json']['is_up'] is True

def test_supabase_sync_batch():
    with patch.object(Config, 'SUPABASE_URL', 'https://test.supabase.co'), \
         patch.object(Config, 'SUPABASE_KEY', 'testkey'), \
         patch('requests.post') as mock_post:
        
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        checks = [
            Check(url="https://example.com", is_up=True),
            Check(url="https://test.com", is_up=False)
        ]
        count = SupabaseService.sync_batch(checks)
        
        assert count == 2
        mock_post.assert_called_once()
