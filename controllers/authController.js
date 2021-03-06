// Modules
const crypto        = require('crypto')  
// Files
const asyncHandler  = require('../middlewares/async')
const ErrorResponse = require('../utils/errorResponse')
const sendEmail     = require('../utils/sendEmail')
const User          = require('../models/User')

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.registerUser = asyncHandler(async(req, res, next) => {
    const { name, email, password, role } = req.body
    
    const registerUser = await User.create({
        name, 
        email,
        password,
        role
    })

    sendTokenResponse(registerUser, 200, res)
})

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.loginUser = asyncHandler(async(req, res, next) => {
    const { email, password } = req.body
    if(!email || !password ){
        return next(new ErrorResponse('Please provide email and password', 400))
    }
    
    const loginUser = await User.findOne({ email }).select('+password')
    if (!loginUser) {
        return next(new ErrorResponse('Invalid credentials', 401))
    }
    
    const isMatch   = await loginUser.matchPassword(password)
    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401))
    }

    sendTokenResponse(loginUser, 200, res)
})

// @desc    Get current logged in user
// @route   POST /api/v1/auth/currentUser
// @access  Private
exports.currentUser = asyncHandler(async(req, res, next) => {
    const currentUser = await User.findById(req.user.id)

    res.status(200)
        .json({
            success: true,
            data: currentUser
        })
})

// @desc    Logout user and clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logoutUser = asyncHandler(async(req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })
    res.status(200)
        .json({
            success: true,
            data: {}
        })
})

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async(req, res, next) => {
    const user = await User.findById(req.user.id).select('+password')

    if(!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Incorrect password', 401))
    }

    user.password = req.body.newPassword
    await user.save()

    sendTokenResponse(user, 200, res)
})

// @desc    Update user details
// @route   PUT /api/v1/auth/updateuser
// @access  Private
exports.updateUser = asyncHandler(async(req, res, next) => {
    const updateFields = {
        name: req.body.name,
        email: req.body.email
    }

    const updateUser = await User.findByIdAndUpdate(req.user.id, updateFields, {
        new: true,
        runValidators: true       
    })

    res.status(200)
        .json({
            success: true,
            data: updateUser
        })
})

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resetToken
// @access  Public
exports.resetPassword = asyncHandler(async(req, res, next) => {
    const resetPasswordToken    = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex')
    
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() } 
    })

    if(!user) return next(new ErrorResponse('Invalid token', 400))

    user.password               = req.body.password
    user.resetPasswordToken     = undefined
    user.resetPasswordExpire    = undefined

    await user.save()
    sendTokenResponse(user, 200, res)
})

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async(req, res, next) => {
    const user = await User.findOne({ email: req.body.email })

    if (!user) return next(new ErrorResponse(`User with email: ${req.body.email} not found`, 404))

    const resetToken = user.getResetPasswordToken()

    await user.save({ validateBeforeSave: false })

    const resetUrl  = `${req.protocol}://${req.get('host')}/api/${process.env.API_V}/auth/resetpassword/${resetToken}`
    const message   = `You are recieving this email because you have request a password reset. Please make a PUT request to: \n\n${resetUrl}`
    // const message   = `You are recieving this email because you have request a password reset. Please make a PUT request to: \n\n<a href="${resetUrl}">Reset Password</a>`

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Token',
            message
        })
        
        res.status(200)
            .json({
                success: true
            })
    } catch (error) {
        console.error(error)

        user.ResetPasswordToken     = undefined
        user.ResetPasswordExpire    = undefined

        await user.save({ validateBeforeSave: false })
        return next(new ErrorResponse(`Email could not be sent`, 500))
    }
})

const sendTokenResponse = (user, statusCode, res) => {
    const token     = user.getSignedJwttoken()
    const options   = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    }

    process.env.NODE_ENV === 'production' ? options.secure = true : 

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token
        })
}