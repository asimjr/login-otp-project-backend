// ===============================
// server.js
// ===============================

// 🔹 1. Load environment variables
require('dotenv').config()

// 🔹 2. Import required packages
const express = require('express')
const cors = require('cors')
const nodemailer = require('nodemailer')
const { PrismaClient } = require('@prisma/client')

// 🔹 3. Initialize app & prisma
const app = express()
const prisma = new PrismaClient()

// 🔹 4. Middlewares
app.use(cors())
app.use(express.json())

// 🔹 5. Test route (VERY IMPORTANT)
app.get('/', (req, res) => {
  res.send('✅ Backend is running successfully')
})

// 🔹 6. Email transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})

// 🔹 7. LOGIN + SEND OTP
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('📧 Login attempt:', { email, password })

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User not found')
      return res.status(404).json({ message: 'User not found' })
    }

    console.log('🔐 Stored password:', user.password)
    console.log('🔐 Provided password:', password)
    console.log('🔐 Match:', user.password === password)

    if (user.password !== password) {
      console.log('❌ Wrong password')
      return res.status(401).json({ message: 'Wrong password' })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Save OTP in database
    await prisma.user.update({
      where: { email },
      data: { otp }
    })

    // Send OTP email via SMTP (skip in dev mode)
    if (process.env.SKIP_EMAIL !== 'true') {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Login OTP',
        text: `Your OTP is ${otp}`
      })
      console.log('✅ OTP sent to email successfully:', email)
      res.json({ message: 'OTP sent successfully to your email' })
    } else {
      console.log('📧 [DEV MODE] OTP generated:', otp)
      res.json({ message: 'OTP generated. Check terminal console for OTP (dev mode)' })
    }

  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({ message: 'Error: ' + error.message })
  }
})

// 🔹 8. VERIFY OTP
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP required' })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { email },
      data: { otp: null }
    })

    res.json({ message: '🎉 Login successful' })

  } catch (error) {
    console.error('OTP verify error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 🔹 9. Start server (MOST IMPORTANT PART)
const PORT = 5000
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})

// Keep server alive
server.on('error', (err) => {
  console.error('Server error:', err)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
})
