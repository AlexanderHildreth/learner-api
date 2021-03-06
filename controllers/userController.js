// Files
const asyncHandler  = require('../middlewares/async')
const ErrorResponse = require('../utils/errorResponse')
const User          = require('../models/User')

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.customResults)
})

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res, next) => {
    const getUser = await User.findById(req.params.id)

    res.status(200)
        .json({
            success: true,
            data: getUser
        })
})

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
    const createUser = await User.create(req.body)

    res.status(201)
        .json({
            success: true,
            data: createUser
        })
})

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
    const updateUser = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })

    res.status(201)
        .json({
            success: true,
            data: updateUser
        })
})

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndDelete(req.params.id)

    res.status(201)
        .json({
            success: true,
            data: {}
        })
})
