import LoginForm from '../../components/profiles/auth/LoginForm';
import { CompactLanguageSwitcher } from '../../components/ui/LanguageSwitcher';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-milk-white py-12">
      <div className="container mx-auto px-4">
        {/* Language Switcher in top right */}
        <div className="flex justify-end mb-4">
          <CompactLanguageSwitcher />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">woofadaar</h1>
          <p className="text-dark-grey">Welcome back to your community</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}