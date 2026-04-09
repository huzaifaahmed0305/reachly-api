/**
 * FIXED Auth Controller — src/controllers/auth.controller.js
 * Replaces your existing auth.controller.js
 * Changes:
 * - Uses Supabase built-in auth (fixes RLS issues)
 * - Email verification via Supabase
 * - Secure password hashing
 * - Better error messages
 */
import { supabase, supabaseAdmin } from '../utils/supabase.js'
import { signToken } from '../utils/jwt.js'

export const register = async (req, res) => {
  const { email, password, name, role, handle } = req.body

  // 1. Create auth user in Supabase Auth (handles email verification)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
      emailRedirectTo: `${process.env.FRONTEND_URL}/verify-email`,
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return res.status(409).json({ error: 'This email is already registered' })
    }
    return res.status(400).json({ error: authError.message })
  }

  const supabaseUserId = authData.user?.id
  if (!supabaseUserId) {
    return res.status(500).json({ error: 'Failed to create account. Please try again.' })
  }

  // 2. Insert into our users table
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: supabaseUserId,
      email,
      name,
      role,
      email_verified: false,
    })
    .select()
    .single()

  if (userError) {
    // Cleanup supabase auth user if our insert fails
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId)
    console.error('User insert error:', userError)
    return res.status(500).json({ error: 'Failed to create account. Please try again.' })
  }

  // 3. If influencer — create influencer profile
  let influencerId = null
  if (role === 'influencer') {
    const cleanHandle = handle
      ? handle.toLowerCase().replace(/[^a-z0-9_]/g, '')
      : email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')

    // Check handle is unique
    const { data: existing } = await supabaseAdmin
      .from('influencers')
      .select('id')
      .eq('handle', cleanHandle)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'This username is already taken. Please choose another.' })
    }

    const { data: influencer, error: infError } = await supabaseAdmin
      .from('influencers')
      .insert({ user_id: user.id, name, handle: cleanHandle })
      .select()
      .single()

    if (infError) {
      console.error('Influencer insert error:', infError)
      return res.status(500).json({ error: 'Failed to create creator profile.' })
    }

    influencerId = influencer.id

    await supabaseAdmin
      .from('users')
      .update({ influencer_id: influencerId })
      .eq('id', user.id)
  }

  const token = signToken({ userId: user.id, role })

  res.status(201).json({
    message: role === 'influencer'
      ? 'Account created! Please check your email to verify your account.'
      : 'Account created! Please check your email to verify your account.',
    token,
    user: {
      id: user.id,
      email,
      name,
      role,
      influencer_id: influencerId,
      email_verified: false,
    },
    email_verification_required: true,
  })
}

export const login = async (req, res) => {
  const { email, password } = req.body

  // Use Supabase Auth for login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      return res.status(401).json({ error: 'Incorrect email or password' })
    }
    if (authError.message.includes('Email not confirmed')) {
      return res.status(401).json({
        error: 'Please verify your email first. Check your inbox for the verification link.',
        email_not_verified: true,
      })
    }
    return res.status(401).json({ error: authError.message })
  }

  // Get our user record
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, influencer_id, email_verified')
    .eq('email', email)
    .single()

  if (userError || !user) {
    return res.status(401).json({ error: 'Account not found. Please register first.' })
  }

  // Mark email as verified if Supabase auth confirms it
  if (authData.user?.email_confirmed_at && !user.email_verified) {
    await supabaseAdmin
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id)
    user.email_verified = true
  }

  const token = signToken({ userId: user.id, role: user.role })

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      influencer_id: user.influencer_id,
      email_verified: user.email_verified,
    },
  })
}

export const me = async (req, res) => {
  res.json({ user: req.user })
}

export const resendVerification = async (req, res) => {
  const { email } = req.body
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.FRONTEND_URL}/verify-email`,
    },
  })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Verification email sent! Check your inbox.' })
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Password reset link sent to your email.' })
}
