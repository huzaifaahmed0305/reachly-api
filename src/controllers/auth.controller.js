import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../utils/supabase.js'
import { signToken } from '../utils/jwt.js'

export const register = async (req, res) => {
  const { email, password, name, role, handle } = req.body

  console.log('=== REGISTER START ===')
  console.log('Body:', { email, name, role, handle })

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    // Test Supabase connection
    const { error: testError } = await supabaseAdmin.from('users').select('count').limit(1)
    if (testError) {
      console.log('FAIL: Supabase error:', testError.message)
      return res.status(500).json({ error: 'Database error: ' + testError.message })
    }
    console.log('Supabase OK')

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (existing) return res.status(409).json({ error: 'Email already registered. Please login.' })

    // Hash + insert
    const passwordHash = await bcrypt.hash(password, 10)
    const { data: user, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, name: name.trim(), role, email_verified: false })
      .select().single()

    if (insertError) {
      console.log('FAIL: Insert error:', insertError.message, insertError.code)
      return res.status(500).json({ error: 'Could not create account: ' + insertError.message })
    }
    console.log('User created:', user.id)

    let influencerId = null
    if (role === 'influencer') {
      const cleanHandle = (handle || name).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_')
      const { data: inf, error: infErr } = await supabaseAdmin
        .from('influencers')
        .insert({ user_id: user.id, name: name.trim(), handle: cleanHandle, is_active: true })
        .select().single()
      if (infErr) { console.log('Influencer error (non-fatal):', infErr.message) }
      else {
        influencerId = inf.id
        await supabaseAdmin.from('users').update({ influencer_id: influencerId }).eq('id', user.id)
        console.log('Influencer created:', inf.handle)
      }
    }

    const token = signToken({ userId: user.id, role })
    console.log('=== REGISTER SUCCESS ===')
    return res.status(201).json({
      message: 'Account created!',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, influencer_id: influencerId },
    })
  } catch (err) {
    console.log('FAIL unexpected:', err.message)
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}

export const login = async (req, res) => {
  const { email, password } = req.body
  console.log('=== LOGIN START ===', email)
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users').select('id, email, name, role, password_hash, influencer_id')
      .eq('email', email.toLowerCase().trim()).maybeSingle()

    if (error) return res.status(500).json({ error: 'Database error: ' + error.message })
    if (!user) return res.status(401).json({ error: 'No account with this email. Please register.' })
    if (!user.password_hash) return res.status(401).json({ error: 'Account incomplete. Please register again.' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Wrong password. Please try again.' })

    const token = signToken({ userId: user.id, role: user.role })
    console.log('=== LOGIN SUCCESS ===')
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, influencer_id: user.influencer_id },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}

export const me = async (req, res) => { res.json({ user: req.user }) }
export const resendVerification = async (req, res) => { res.json({ message: 'Coming soon.' }) }
export const forgotPassword = async (req, res) => { res.json({ message: 'Reset link sent.' }) }