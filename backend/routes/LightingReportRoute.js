const express = require("express");
const router = express.Router();
const LightingReport = require("../models/LightingReport"); // your schema file

router.post("/report-light", async (req, res) => {
  try {
    const { lat, lng, luxEstimate, photoUrl, notes } = req.body;

    const report = new LightingReport({
      user: null,                     // no auth requested
      location: {
        type: "Point",
        coordinates: [lng, lat]       // GeoJSON = [longitude, latitude]
      },
      luxEstimate,
      photoUrl,
      notes
    });

    const saved = await report.save();
    return res.json({ success: true, data: saved });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
