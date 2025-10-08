import { supabase } from './supabase'
import type { User, AuthError } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  username: string
  fullName: string | null
  userType: 'buyer' | 'seller' | 'admin'
  avatarUrl: string | null
  phone: string | null
  isVerified: boolean
  createdAt: string
}

export interface SignUpData {
  email: string
  password: string
  username: string
  fullName?: string
  userType: 'buyer' | 'seller'
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  // Sign up new user
  static async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', data.username)
        .single()

      if (existingUser) {
        return {
          user: null,
          error: { message: 'Username already taken', name: 'UsernameError', status: 400 } as AuthError
        }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            full_name: data.fullName,
            user_type: data.userType,
            phone: data.phone
          }
        }
      })

      if (authError) {
        return { user: null, error: authError }
      }

      if (!authData.user) {
        return { 
          user: null, 
          error: { message: 'Failed to create user', name: 'SignUpError', status: 400 } as AuthError 
        }
      }

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          username: data.username,
          full_name: data.fullName || null,
          user_type: data.userType,
          phone: data.phone || null,
          is_verified: false
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Auth user was created but profile failed - this is handled by database triggers in production
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: data.email,
        username: data.username,
        fullName: data.fullName || null,
        userType: data.userType,
        avatarUrl: null,
        phone: data.phone || null,
        isVerified: false,
        createdAt: authData.user.created_at
      }

      return { user, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { 
        user: null, 
        error: { message: 'An unexpected error occurred', name: 'UnknownError', status: 500 } as AuthError 
      }
    }
  }

  // Sign in user
  static async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        return { user: null, error: authError }
      }

      if (!authData.user) {
        return { 
          user: null, 
          error: { message: 'Invalid credentials', name: 'SignInError', status: 401 } as AuthError 
        }
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profileData) {
        console.error('Profile fetch error:', profileError)
        return { 
          user: null, 
          error: { message: 'User profile not found', name: 'ProfileError', status: 404 } as AuthError 
        }
      }

      const user: AuthUser = {
        id: profileData.id,
        email: profileData.email,
        username: profileData.username,
        fullName: profileData.full_name,
        userType: profileData.user_type,
        avatarUrl: profileData.avatar_url,
        phone: profileData.phone,
        isVerified: profileData.is_verified,
        createdAt: profileData.created_at
      }

      return { user, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { 
        user: null, 
        error: { message: 'An unexpected error occurred', name: 'UnknownError', status: 500 } as AuthError 
      }
    }
  }

  // Sign out user
  static async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Get current user
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        return null
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profileData) {
        console.error('Profile fetch error:', profileError)
        return null
      }

      return {
        id: profileData.id,
        email: profileData.email,
        username: profileData.username,
        fullName: profileData.full_name,
        userType: profileData.user_type,
        avatarUrl: profileData.avatar_url,
        phone: profileData.phone,
        isVerified: profileData.is_verified,
        createdAt: profileData.created_at
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  // Update user profile
  static async updateProfile(updates: Partial<Omit<AuthUser, 'id' | 'email' | 'createdAt'>>): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        return { 
          user: null, 
          error: { message: 'Not authenticated', name: 'AuthError', status: 401 } as AuthError 
        }
      }

      // Update profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .update({
          username: updates.username,
          full_name: updates.fullName,
          user_type: updates.userType,
          avatar_url: updates.avatarUrl,
          phone: updates.phone,
          is_verified: updates.isVerified
        })
        .eq('id', authUser.id)
        .select()
        .single()

      if (profileError) {
        return { 
          user: null, 
          error: { message: profileError.message, name: 'UpdateError', status: 400 } as AuthError 
        }
      }

      const user: AuthUser = {
        id: profileData.id,
        email: profileData.email,
        username: profileData.username,
        fullName: profileData.full_name,
        userType: profileData.user_type,
        avatarUrl: profileData.avatar_url,
        phone: profileData.phone,
        isVerified: profileData.is_verified,
        createdAt: profileData.created_at
      }

      return { user, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { 
        user: null, 
        error: { message: 'An unexpected error occurred', name: 'UnknownError', status: 500 } as AuthError 
      }
    }
  }

  // Reset password
  static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { error }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  }

  // Check if user has specific role
  static async hasRole(role: 'buyer' | 'seller' | 'admin'): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.userType === role
  }

  // Verify email
  static async verifyEmail(token: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })
    return { error }
  }

  // Resend verification email
  static async resendVerification(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    return { error }
  }
}

export default AuthService
