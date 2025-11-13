import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useFirebaseAuth } from '@/lib/firebase/hooks/useFirebaseAuth'
import { useAuth } from '@/lib/api/hooks/useAuth'
import { Chrome } from 'lucide-react'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  
  const { signUp, signInWithGoogle, error, clearError, firebaseUser } = useFirebaseAuth()
  const { isAuthenticated } = useAuth()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await signUp({ name, email, password })
      // Wait a bit for auth state to settle then redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      console.error('Registration failed:', error)
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true)
    
    try {
      await signInWithGoogle()
      // Wait a bit for auth state to settle then redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      console.error('Google sign up failed:', error)
      setIsSubmitting(false)
    }
  }

  // Clear error when user starts typing
  const handleInputChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    setter(e.target.value)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-2">
            Get started with OneClickTag
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleInputChange(setName)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleInputChange(setEmail)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignUp}
          disabled={isSubmitting}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Creating Account...' : 'Google'}
        </Button>
        
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}