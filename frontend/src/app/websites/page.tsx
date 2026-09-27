import { redirect } from 'next/navigation';

// The Monitor Websites section has moved inside the main dashboard.
// Redirect any direct visits to /websites → / (dashboard)
export default function WebsitesRedirectPage() {
  redirect('/');
}
