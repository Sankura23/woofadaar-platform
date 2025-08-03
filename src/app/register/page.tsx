import RegisterForm from '@/components/profiles/auth/RegisterForm';
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-milk-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">woofadaar</h1>
          <p className="text-dark-grey">Join India's largest dog parent community</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}