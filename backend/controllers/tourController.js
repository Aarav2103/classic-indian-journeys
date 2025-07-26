import Tour from "../models/Tour.js";

// create new tour
export const createTour = async (req, res) => {
  try {
    const newTour = new Tour(req.body);
    const savedTour = await newTour.save();
    res.status(200).json({
      success: true,
      message: "Successfully created",
      data: savedTour,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create tour" });
  }
};

// update tour
export const updateTour = async (req, res) => {
  const id = req.params.id;
  try {
    const updatedTour = await Tour.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Tour updated successfully",
      data: updatedTour,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update tour" });
  }
};

// delete tour
export const deleteTour = async (req, res) => {
  const id = req.params.id;
  try {
    await Tour.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Tour deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete tour" });
  }
};

// get single tour
export const getSingleTour = async (req, res) => {
  const id = req.params.id;
  try {
    const tour = await Tour.findById(id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Tour retrieved successfully",
      data: tour,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get the tour" });
  }
};

// get all tours
export const getAllTour = async (req, res) => {
  try {
    const tours = await Tour.find();
    res.status(200).json({
      success: true,
      count: tours.length,
      message: "Tours retrieved successfully",
      data: tours,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get tours" });
  }
};

// get featured tours
export const getFeaturedTour = async (req, res) => {
  try {
    const tours = await Tour.find({ featured: true });
    res.status(200).json({
      success: true,
      message: "Tours retrieved successfully",
      data: tours,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get tours" });
  }
};

// get tours by region
// controllers/tourController.js
// controllers/tourController.js
export const getToursByRegion = async (req, res) => {
  try {
    const slug = req.params.region;              // e.g. "central-india"
    const regex = new RegExp(`^${slug}$`, "i");  // exact, case-insensitive match

    const tours = await Tour.find({ region: regex });

    if (!tours.length) {
      return res.status(404).json({
        success: false,
        message: `No tours found for region: ${slug}`,
      });
    }

    res.status(200).json({
      success: true,
      count: tours.length,
      message: `Tours for region: ${slug}`,
      data: tours,
    });
  } catch (err) {
    console.error("Get Tours By Region Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tours by region",
      error: err.message,
    });
  }
};



   

// ✅ get total tour count
export const getTourCount = async (req, res) => {
  try {
    const count = await Tour.estimatedDocumentCount();
    res.status(200).json({
      success: true,
      message: "Total number of tours fetched successfully",
      data: count,
    });
  } catch (err) {
    console.error("Get Tour Count Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tour count" });
  }
};
