const Gig = require('../models/Gig');
const { logActivity } = require('../middleware/auditLog');

async function createGig(req, res) {
  try {
    const { title, description, price, category, duration } = req.body;
    
    if (!title || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, price, and category are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    const newGig = new Gig({
      title,
      description,
      price,
      category,
      freelancerId: req.user.id,
      freelancerName: req.user.name || 'Freelancer',
      duration: duration || 'To be discussed'
    });

    await newGig.save();

      logActivity(req, 'gig.created', {
      targetType: 'Gig',
      targetId: newGig._id,
      metadata: { title: newGig.title, category: newGig.category }
    });

    return res.status(201).json({
      success: true,
      message: 'Gig created successfully',
      data: newGig
    });
  } catch (error) {
    console.error('Create gig error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating the gig'
    });
  }
}

async function getAllGigs(req, res) {
  try {
    const { category } = req.query;
    let gigs;
    
    if (category) {
      gigs = await Gig.findByCategory(category);
    } else {
      gigs = await Gig.findAllActive();
    }
    
    return res.status(200).json({
      success: true,
      count: gigs.length,
      data: gigs
    });
  } catch (error) {
    console.error('Get gigs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching gigs'
    });
  }
}

async function getGigById(req, res) {
  try {
    const { id } = req.params;
    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: gig
    });
  } catch (error) {
    console.error('Get gig error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the gig'
    });
  }
}

async function getMyGigs(req, res) {
  try {
    const gigs = await Gig.findByFreelancer(req.user.id);
    
    return res.status(200).json({
      success: true,
      count: gigs.length,
      data: gigs
    });
  } catch (error) {
    console.error('Get my gigs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching your gigs'
    });
  }
}

async function updateGig(req, res) {
  try {
    const { id } = req.params;
    const { title, description, price, category, duration, status } = req.body;
    
    const existingGig = await Gig.findById(id);
    if (!existingGig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }
    
    if (existingGig.freelancerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs'
      });
    }
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = price;
    if (category) updateData.category = category;
    if (duration) updateData.duration = duration;
    if (status) updateData.status = status;
    
    const updatedGig = await Gig.updateGig(id, updateData);

      logActivity(req, 'gig.updated', {
      targetType: 'Gig',
      targetId: id,
      metadata: { fields: Object.keys(updateData) }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Gig updated successfully',
      data: updatedGig
    });
  } catch (error) {
    console.error('Update gig error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the gig'
    });
  }
}

async function deleteGig(req, res) {
  try {
    const { id } = req.params;
    
    const existingGig = await Gig.findById(id);
    if (!existingGig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }
    
    if (existingGig.freelancerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own gigs'
      });
    }
    
    const deletedGig = await Gig.deleteGig(id);

      logActivity(req, 'gig.deleted', {
      targetType: 'Gig',
      targetId: id,
      metadata: { title: existingGig.title }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Gig deleted successfully',
      data: deletedGig
    });
  } catch (error) {
    console.error('Delete gig error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while deleting the gig'
    });
  }
}

module.exports = {
  createGig,
  getAllGigs,
  getGigById,
  getMyGigs,
  updateGig,
  deleteGig
};