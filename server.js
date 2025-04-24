const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const app = express()
const PORT = 5000
const SECRET_KEY = "Turf@2023"

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB Connection
mongoose
  .connect("mongodb+srv://alpha_0604:KoepfzFY1pyCP7x6@cluster0.aychm1z.mongodb.net/Turf", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err))

// User Schema
const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ["user", "owner"],
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  profileImage: {
    type: String,
    default: "https://via.placeholder.com/150",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Turf Schema
const TurfSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    coordinates: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
  },
  description: {
    type: String,
    required: true,
  },
  amenities: {
    type: [String],
    default: [],
  },
  pricing: {
    hourly: {
      type: Number,
      required: true,
    },
    halfDay: {
      type: Number,
    },
    fullDay: {
      type: Number,
    },
  },
  images: {
    type: [String],
    default: ["https://via.placeholder.com/800x400?text=Turf"],
  },
  openingTime: {
    type: String,
    required: true,
  },
  closingTime: {
    type: String,
    required: true,
  },
  availableDays: {
    type: [String],
    default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  },
  rating: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      userName: {
        type: String,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Booking Schema
const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  turfId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Turf",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  turfName: {
    type: String,
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // in hours
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  bookingStatus: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  playerCount: {
    type: Number,
    default: 1,
  },
  specialRequests: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const User = mongoose.model("User", UserSchema)
const Turf = mongoose.model("Turf", TurfSchema)
const Booking = mongoose.model("Booking", BookingSchema)

// Authentication Middleware
const auth = (req, res, next) => {
  const token = req.header("x-auth-token")
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" })

  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" })
  }
}

// Routes
// Register User
app.post("/api/users/register", async (req, res) => {
  const { fullName, email, password, userType, phone, address, profileImage } = req.body

  try {
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ msg: "User already exists" })
    }

    user = new User({
      fullName,
      email,
      password,
      userType,
      phone,
      address,
      profileImage: profileImage || "https://via.placeholder.com/150",
    })

    // Hash password
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    await user.save()

    // Create JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
      },
    }

    jwt.sign(payload, SECRET_KEY, { expiresIn: "5d" }, (err, token) => {
      if (err) throw err
      res.json({ token, user: payload.user })
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Login User
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ msg: "Invalid Credentials" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials" })
    }

    // Create JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
      },
    }

    jwt.sign(payload, SECRET_KEY, { expiresIn: "5d" }, (err, token) => {
      if (err) throw err
      res.json({ token, user: payload.user })
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Get User Profile
app.get("/api/users/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user.id).select("-password")
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Create Turf
app.post("/api/turfs", auth, async (req, res) => {
  const { name, location, description, amenities, pricing, images, openingTime, closingTime, availableDays } = req.body

  try {
    const owner = await User.findById(req.user.user.id)

    if (owner.userType !== "owner") {
      return res.status(403).json({ msg: "Only turf owners can create turf listings" })
    }

    const newTurf = new Turf({
      ownerId: req.user.user.id,
      name,
      location,
      description,
      amenities,
      pricing,
      images: images || ["https://via.placeholder.com/800x400?text=Turf"],
      openingTime,
      closingTime,
      availableDays,
    })

    const turf = await newTurf.save()
    res.json(turf)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Get All Turfs
app.get("/api/turfs", async (req, res) => {
  try {
    const { city, date } = req.query
    const query = { isActive: true }

    if (city) {
      query["location.city"] = city
    }

    const turfs = await Turf.find(query).sort({ createdAt: -1 })

    // If date is provided, filter out turfs that have bookings for all time slots on that date
    if (date) {
      const bookingDate = new Date(date)
      const bookings = await Booking.find({
        bookingDate: {
          $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          $lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        bookingStatus: { $in: ["pending", "confirmed"] },
      })

      // Group bookings by turfId
      const bookingsByTurf = {}
      bookings.forEach((booking) => {
        if (!bookingsByTurf[booking.turfId]) {
          bookingsByTurf[booking.turfId] = []
        }
        bookingsByTurf[booking.turfId].push({
          startTime: booking.startTime,
          endTime: booking.endTime,
        })
      })

      // Filter turfs based on availability
      const availableTurfs = turfs.filter((turf) => {
        const turfBookings = bookingsByTurf[turf._id] || []

        // Calculate total hours of operation
        const openingHour = Number.parseInt(turf.openingTime.split(":")[0])
        const closingHour = Number.parseInt(turf.closingTime.split(":")[0])
        const totalHours = closingHour - openingHour

        // Calculate total booked hours
        let bookedHours = 0
        turfBookings.forEach((booking) => {
          const startHour = Number.parseInt(booking.startTime.split(":")[0])
          const endHour = Number.parseInt(booking.endTime.split(":")[0])
          bookedHours += endHour - startHour
        })

        // If all hours are booked, exclude the turf
        return bookedHours < totalHours
      })

      return res.json(availableTurfs)
    }

    res.json(turfs)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Get Turf by ID
app.get("/api/turfs/:id", async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id)

    if (!turf) {
      return res.status(404).json({ msg: "Turf not found" })
    }

    res.json(turf)
  } catch (err) {
    console.error(err.message)
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Turf not found" })
    }
    res.status(500).send("Server error")
  }
})

// Get Owner Turfs
app.get("/api/owner/turfs", auth, async (req, res) => {
  try {
    const owner = await User.findById(req.user.user.id)

    if (owner.userType !== "owner") {
      return res.status(403).json({ msg: "Not authorized" })
    }

    const turfs = await Turf.find({ ownerId: req.user.user.id }).sort({ createdAt: -1 })

    res.json(turfs)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Update Turf
app.put("/api/turfs/:id", auth, async (req, res) => {
  const { name, location, description, amenities, pricing, images, openingTime, closingTime, availableDays, isActive } =
    req.body

  try {
    const turf = await Turf.findById(req.params.id)

    if (!turf) {
      return res.status(404).json({ msg: "Turf not found" })
    }

    // Check if user owns the turf
    if (turf.ownerId.toString() !== req.user.user.id) {
      return res.status(401).json({ msg: "User not authorized" })
    }

    // Update fields
    if (name) turf.name = name
    if (location) turf.location = location
    if (description) turf.description = description
    if (amenities) turf.amenities = amenities
    if (pricing) turf.pricing = pricing
    if (images) turf.images = images
    if (openingTime) turf.openingTime = openingTime
    if (closingTime) turf.closingTime = closingTime
    if (availableDays) turf.availableDays = availableDays
    if (isActive !== undefined) turf.isActive = isActive

    await turf.save()

    res.json(turf)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Get Available Time Slots
app.get("/api/turfs/:id/available-slots", async (req, res) => {
  const { date } = req.query

  if (!date) {
    return res.status(400).json({ msg: "Date is required" })
  }

  try {
    const turf = await Turf.findById(req.params.id)

    if (!turf) {
      return res.status(404).json({ msg: "Turf not found" })
    }

    const bookingDate = new Date(date)

    // Check if the selected day is available
    const dayOfWeek = new Date(date).toLocaleString("en-us", { weekday: "long" })
    if (!turf.availableDays.includes(dayOfWeek)) {
      return res.json({ availableSlots: [] })
    }

    // Get all bookings for this turf on the selected date
    const bookings = await Booking.find({
      turfId: req.params.id,
      bookingDate: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
      },
      bookingStatus: { $in: ["pending", "confirmed"] },
    })

    // Generate all possible time slots
    const openingHour = Number.parseInt(turf.openingTime.split(":")[0])
    const closingHour = Number.parseInt(turf.closingTime.split(":")[0])

    const allSlots = []
    for (let hour = openingHour; hour < closingHour; hour++) {
      allSlots.push({
        startTime: `${hour}:00`,
        endTime: `${hour + 1}:00`,
        isAvailable: true,
      })
    }

    // Mark booked slots as unavailable
    bookings.forEach((booking) => {
      const startHour = Number.parseInt(booking.startTime.split(":")[0])
      const endHour = Number.parseInt(booking.endTime.split(":")[0])

      for (let hour = startHour; hour < endHour; hour++) {
        const slotIndex = allSlots.findIndex((slot) => Number.parseInt(slot.startTime.split(":")[0]) === hour)
        if (slotIndex !== -1) {
          allSlots[slotIndex].isAvailable = false
        }
      }
    })

    res.json({ availableSlots: allSlots })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Create Booking
app.post("/api/bookings", auth, async (req, res) => {
  const { turfId, bookingDate, startTime, endTime, playerCount, specialRequests } = req.body

  try {
    const user = await User.findById(req.user.user.id)

    if (user.userType !== "user") {
      return res.status(403).json({ msg: "Only users can book turfs" })
    }

    const turf = await Turf.findById(turfId)

    if (!turf) {
      return res.status(404).json({ msg: "Turf not found" })
    }

    // Check if the slot is available
    const bookingDateObj = new Date(bookingDate)
    const existingBooking = await Booking.findOne({
      turfId,
      bookingDate: {
        $gte: new Date(bookingDateObj.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDateObj.setHours(23, 59, 59, 999)),
      },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        },
      ],
      bookingStatus: { $in: ["pending", "confirmed"] },
    })

    if (existingBooking) {
      return res.status(400).json({ msg: "This time slot is already booked" })
    }

    // Calculate duration and total amount
    const startHour = Number.parseInt(startTime.split(":")[0])
    const endHour = Number.parseInt(endTime.split(":")[0])
    const duration = endHour - startHour
    const totalAmount = duration * turf.pricing.hourly

    const newBooking = new Booking({
      userId: req.user.user.id,
      turfId,
      userName: user.fullName,
      turfName: turf.name,
      bookingDate,
      startTime,
      endTime,
      duration,
      totalAmount,
      playerCount,
      specialRequests,
    })

    const booking = await newBooking.save()
    res.json(booking)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Get User Bookings
app.get("/api/user/bookings", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user.id)

    if (user.userType !== "user") {
      return res.status(403).json({ msg: "Not authorized" })
    }

    const bookings = await Booking.find({ userId: req.user.user.id }).sort({ bookingDate: -1 })

    res.json(bookings)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Get Owner Bookings
app.get("/api/owner/bookings", auth, async (req, res) => {
  try {
    const owner = await User.findById(req.user.user.id)

    if (owner.userType !== "owner") {
      return res.status(403).json({ msg: "Not authorized" })
    }

    // Get all turfs owned by this owner
    const turfs = await Turf.find({ ownerId: req.user.user.id })
    const turfIds = turfs.map((turf) => turf._id)

    // Get all bookings for these turfs
    const bookings = await Booking.find({ turfId: { $in: turfIds } }).sort({ bookingDate: -1 })

    res.json(bookings)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Update Booking Status
app.put("/api/bookings/:id/status", auth, async (req, res) => {
  const { bookingStatus } = req.body

  try {
    const booking = await Booking.findById(req.params.id)

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" })
    }

    // Check if user is authorized to update this booking
    const turf = await Turf.findById(booking.turfId)

    if (!turf) {
      return res.status(404).json({ msg: "Turf not found" })
    }

    if (turf.ownerId.toString() !== req.user.user.id && booking.userId.toString() !== req.user.user.id) {
      return res.status(401).json({ msg: "User not authorized" })
    }

    booking.bookingStatus = bookingStatus
    await booking.save()

    res.json(booking)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Update Payment Status
app.put("/api/bookings/:id/payment", auth, async (req, res) => {
  const { paymentStatus } = req.body

  try {
    const booking = await Booking.findById(req.params.id)

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" })
    }

    // Check if user is authorized to update this booking
    if (booking.userId.toString() !== req.user.user.id) {
      return res.status(401).json({ msg: "User not authorized" })
    }

    booking.paymentStatus = paymentStatus

    // If payment is completed, update booking status to confirmed
    if (paymentStatus === "completed") {
      booking.bookingStatus = "confirmed"
    }

    await booking.save()

    res.json(booking)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Add Review
app.post("/api/turfs/:id/reviews", auth, async (req, res) => {
  const { rating, comment } = req.body

  try {
    const user = await User.findById(req.user.user.id)
    const turf = await Turf.findById(req.params.id)

    if (!turf) {
      return res.status(404).json({ msg: "Turf not found" })
    }

    // Check if user has booked this turf before
    const userBookings = await Booking.find({
      userId: req.user.user.id,
      turfId: req.params.id,
      bookingStatus: "completed",
    })

    if (userBookings.length === 0) {
      return res.status(400).json({ msg: "You can only review turfs you have booked" })
    }

    // Check if user has already reviewed this turf
    const existingReview = turf.reviews.find((review) => review.userId.toString() === req.user.user.id)

    if (existingReview) {
      return res.status(400).json({ msg: "You have already reviewed this turf" })
    }

    // Add review
    turf.reviews.push({
      userId: req.user.user.id,
      userName: user.fullName,
      rating,
      comment,
    })

    // Update overall rating
    const totalRating = turf.reviews.reduce((sum, review) => sum + review.rating, 0)
    turf.rating = totalRating / turf.reviews.length

    await turf.save()

    res.json(turf)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

