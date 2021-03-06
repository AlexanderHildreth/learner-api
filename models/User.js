const crypto    = require('crypto')
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const mongoose  = require('mongoose')

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            "Please add a valid email",
        ],
    },
    role: {
        type: String,
        enum: ['user', 'publisher'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 8,
        select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

// Encryption
UserSchema.pre('save', async function(next) {
    if(!this.isModified('password')){
        next()
    }

    const salt      = await bcrypt.genSalt(10)
    this.password   = await bcrypt.hash(this.password, salt)
})

// Sign JWT and return
UserSchema.methods.getSignedJwttoken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })
}

// Match user password to hassed password
UserSchema.methods.matchPassword = async function(inputPassword) {
    return await bcrypt.compare(inputPassword, this.password)
}

// Generate and hash user token
UserSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex')
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000

    return resetToken
}

module.exports = mongoose.model('User', UserSchema)