const User = require('../models/User');

// @desc    Get all users (excluding current user)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { _id: { $ne: req.user._id } };

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -socketId')
      .sort({ isOnline: -1, name: 1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await User.searchUsers(query.trim(), req.user._id);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -socketId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

// @desc    Get online users
// @route   GET /api/users/online
// @access  Private
const getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = await User.findOnlineUsers();

    // Exclude current user
    const filteredUsers = onlineUsers.filter(user => user._id.toString() !== req.user._id.toString());

    res.json({
      success: true,
      data: filteredUsers
    });
  } catch (error) {
    console.error('Get online users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching online users'
    });
  }
};

// @desc    Update user online status
// @route   PUT /api/users/status
// @access  Private
const updateUserStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        isOnline: Boolean(isOnline),
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password -socketId');

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating status'
    });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/users/:id/block
// @access  Private
const toggleBlockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUser = req.user;

    if (targetUserId === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize blockedUsers array if it doesn't exist
    if (!currentUser.blockedUsers) {
      currentUser.blockedUsers = [];
    }

    const isBlocked = currentUser.blockedUsers.includes(targetUserId);
    
    if (isBlocked) {
      // Unblock user
      currentUser.blockedUsers = currentUser.blockedUsers.filter(
        userId => userId.toString() !== targetUserId
      );
      await currentUser.save();

      res.json({
        success: true,
        message: 'User unblocked successfully',
        data: { isBlocked: false }
      });
    } else {
      // Block user
      currentUser.blockedUsers.push(targetUserId);
      await currentUser.save();

      res.json({
        success: true,
        message: 'User blocked successfully',
        data: { isBlocked: true }
      });
    }
  } catch (error) {
    console.error('Toggle block user error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating block status'
    });
  }
};

// @desc    Get user's blocked users list
// @route   GET /api/users/blocked
// @access  Private
const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name email avatar')
      .select('blockedUsers');

    res.json({
      success: true,
      data: user.blockedUsers || []
    });
  } catch (error) {
    console.error('Get blocked users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching blocked users'
    });
  }
};

module.exports = {
  getUsers,
  searchUsers,
  getUserById,
  getOnlineUsers,
  updateUserStatus,
  toggleBlockUser,
  getBlockedUsers
};
