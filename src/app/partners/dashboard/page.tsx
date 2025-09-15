import { redirect } from 'next/navigation';

// This route redirects to the main partner dashboard
export default function PartnersRedirect() {
  redirect('/partner/dashboard');
}