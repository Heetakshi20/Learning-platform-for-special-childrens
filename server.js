const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const User = require('./models/User');
const Registration = require('./models/Registration');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const Feedback = require('./models/Feedback');
const ExamResult = require('./models/ExamResult');
const Work = require('./models/Work');


const app = express();
const PORT = 3005;

// ✅ MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/bright-minds', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// ✅ Session Setup
app.use(session({
    secret: 'helpinghands_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}));

// ================== STUDENT SIGNUP ROUTE ==================
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password, diagnosis } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('User already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create user with STUDENT role
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: 'student'  // ✅ STUDENT SIGNUP
        });
        await newUser.save();

        // ✅ Also create a basic Registration profile so dashboard loads
        const basicReg = new Registration({
            fullName: name,
            email: email,
            diagnosis: diagnosis || 'ADHD'
        });
        await basicReg.save();

        console.log('✅ Student registered:', name);
        res.redirect('/login.html');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ================== ADMIN SIGNUP ROUTE ==================
app.post('/asignup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('Admin already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create user with ADMIN role
        const newAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin'  // ✅ ADMIN SIGNUP
        });
        await newAdmin.save();
        console.log('✅ Admin registered:', name);
        res.redirect('/alogin.html');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ================== STUDENT LOGIN ROUTE ==================
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.send('User not found');
        }

        // ✅ CHECK IF USER IS STUDENT (NOT ADMIN)
        if (user.role !== 'student') {
            return res.send('❌ Access Denied! You are not a student. Please use admin login.');
        }

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.send('Invalid password');
        }

        // ✅ STORE STUDENT IN SESSION
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: 'student'
        };

        console.log('✅ Student logged in:', req.session.user);
        res.redirect('/dashboard.html');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ================== ADMIN LOGIN ROUTE ==================
app.post('/alogin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email });

        if (!admin) {
            return res.send('Admin not found');
        }

        // ✅ CHECK IF USER IS ADMIN (NOT STUDENT)
        if (admin.role !== 'admin') {
            return res.send('❌ Access Denied! You are not an admin. Please use student login.');
        }

        const validPass = await bcrypt.compare(password, admin.password);
        if (!validPass) {
            return res.send('Invalid password');
        }

        // ✅ STORE ADMIN IN SESSION
        req.session.user = {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: 'admin'
        };

        console.log('✅ Admin logged in:', req.session.user);
        res.redirect('/admin.html');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ================== GET USER PROFILE API (STUDENTS ONLY) ==================
app.get('/api/getUserProfile', async (req, res) => {
    try {
        // ✅ Check if user is in session
        if (!req.session.user) {
            return res.status(401).json({ msg: 'Not logged in' });
        }

        // ✅ CHECK IF USER IS STUDENT
        if (req.session.user.role !== 'student') {
            return res.status(403).json({ msg: 'Access denied. Students only.' });
        }

        const userName = req.session.user.name;
        console.log('🔍 Looking for student profile:', userName);

        // Query Registration collection by fullName
        const userProfile = await Registration.findOne({ fullName: userName });

        if (!userProfile) {
            // Instead of 404, gracefully return a default profile
            console.log('⚠️ Registration not found for', userName, '- sending fallback profile');
            return res.json({
                success: true,
                user: req.session.user,
                profile: {
                    fullName: userName,
                    parentName: 'N/A',
                    diagnosis: 'ADHD' // fallback
                }
            });
        }

        // Return user data
        res.json({
            success: true,
            user: req.session.user,
            profile: {
                fullName: userProfile.fullName || '',
                parentName: userProfile.parentName || '',
                diagnosis: userProfile.diagnosis || '',
                gender: userProfile.gender || '',
                age: userProfile.age || '',
                address: userProfile.address || '',
                cityState: userProfile.cityState || '',
                school: userProfile.school || '',
                learningLevel: userProfile.learningLevel || '',
                photoPath: userProfile.photoPath || '',
                contact: userProfile.contact || '',
                dob: userProfile.dob || '',
                severity: userProfile.severity || '',
                interests: userProfile.interests || [],
                email: userProfile.email || '',
                occupation: userProfile.occupation || ''
            }
        });

        console.log('✅ Student profile found:', userProfile.fullName);
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// ================== GET ADMIN DASHBOARD API (ADMINS ONLY) ==================
app.get('/api/getAdminDash', async (req, res) => {
    try {
        // ✅ Check if user is in session
        if (!req.session.user) {
            return res.status(401).json({ msg: 'Not logged in' });
        }

        // ✅ CHECK IF USER IS ADMIN
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        // Get admin info
        const admin = await User.findById(req.session.user.id).select('-password');

        // Get all students (optional - for admin to see all students)
        const allStudents = await User.find({ role: 'student' }).select('-password');

        // Get all registrations
        const allRegistrations = await Registration.find();

        res.json({
            success: true,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: 'admin'
            },
            stats: {
                totalStudents: allStudents.length,
                totalRegistrations: allRegistrations.length
            },
            students: allStudents,
            registrations: allRegistrations
        });

        console.log('✅ Admin data fetched');
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// ================== LOGOUT ROUTE ==================
app.post('/logout', (req, res) => {
    const userRole = req.session.user?.role;
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out');
        }
        // Redirect to appropriate login page
        if (userRole === 'admin') {
            res.redirect('/alogin.html');
        } else {
            res.redirect('/login.html');
        }
    });
});

// ================== REGISTRATION ROUTE (STUDENTS) ==================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

app.post('/register', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'medicalReport', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            fullName, gender, dob, address, cityState,
            learningLevel, language, school, parentName,
            relation, contact, email, occupation, emergency,
            diagnosis, severity, fitness
        } = req.body;

        const interests = Array.isArray(req.body.interests) ? req.body.interests : req.body.interests ? [req.body.interests] : [];
        const therapy = Array.isArray(req.body.therapy) ? req.body.therapy : req.body.therapy ? [req.body.therapy] : [];

        const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : "";
        const photoPath = req.files['photo'] ? req.files['photo'][0].path : "";
        const medicalReportPath = req.files['medicalReport'] ? req.files['medicalReport'][0].path : "";

        const registration = new Registration({
            fullName, gender, dob, age, address, cityState,
            learningLevel, language, school, interests,
            diagnosis, severity, therapy, fitness,
            parentName, relation, contact, email, occupation, emergency,
            photoPath, medicalReportPath
        });

        await registration.save();
        res.send('Registration successful!');
    } catch (err) {
        res.status(500).send('Error occurred: ' + err.message);
    }
});

// ================== ROOT ROUTE ==================
app.get('/', (req, res) => {
    if (req.session.user) {
        // Redirect based on role
        if (req.session.user.role === 'admin') {
            res.redirect('/admin.html');
        } else {
            res.redirect('/dashboard.html');
        }
    } else {
        res.redirect('/login.html');
    }
});

// ================== START SERVER ==================
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});



const Activity = require('./models/Activity');

// ================== CREATE ACTIVITY (ADMIN ONLY) ==================
app.post('/api/createActivity', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const { title } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ msg: 'Activity title is required' });
        }

        const newActivity = new Activity({
            title: title.trim(),
            createdBy: req.session.user.name
        });

        await newActivity.save();
        console.log('✅ Activity created:', title);

        res.json({
            success: true,
            msg: 'Activity created successfully',
            activity: newActivity
        });

    } catch (err) {
        console.error('❌ Error creating activity:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// ================== GET ALL ACTIVITIES (FOR ADMIN) ==================
app.get('/api/getActivities', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({ msg: 'Not logged in' });
        }

        const activities = await Activity.find({ isActive: true }).sort({ createdAt: -1 });

        res.json({
            success: true,
            activities: activities
        });

        console.log('✅ Activities fetched:', activities.length);

    } catch (err) {
        console.error('❌ Error fetching activities:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// ================== DELETE ACTIVITY (ADMIN ONLY) ==================
app.delete('/api/deleteActivity/:id', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const activityId = req.params.id;

        await Activity.findByIdAndDelete(activityId);
        console.log('✅ Activity deleted:', activityId);

        res.json({
            success: true,
            msg: 'Activity deleted successfully'
        });

    } catch (err) {
        console.error('❌ Error deleting activity:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});



// ================== GET ALL REGISTERED STUDENTS (ADMIN) ==================
app.get('/api/getAllStudents', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        // Fetch all registrations from database
        const students = await Registration.find();

        // Map database fields to match admin table format
        const studentsList = students.map(student => ({
            id: student._id.toString(),
            name: student.fullName,
            gender: student.gender,
            age: student.age,
            diagnosis: student.diagnosis,
            severity: student.severity,
            parentName: student.parentName,
            email: student.email,
            contact: student.contact,
            address: student.address,
            school: student.school,
            learningLevel: student.learningLevel
        }));

        console.log('✅ Fetched', studentsList.length, 'students from database');

        res.json({
            success: true,
            students: studentsList
        });

    } catch (err) {
        console.error('❌ Error fetching students:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// ================== DELETE STUDENT (ADMIN ONLY) ==================
app.delete('/api/deleteStudent/:id', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const studentId = req.params.id;

        await Registration.findByIdAndDelete(studentId);
        console.log('✅ Student deleted:', studentId);

        res.json({
            success: true,
            msg: 'Student deleted successfully'
        });

    } catch (err) {
        console.error('❌ Error deleting student:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});




// ================== SUBMIT FEEDBACK (STUDENTS) ==================
app.post('/api/submitFeedback', async (req, res) => {
    try {
        console.log('📝 Feedback submission request received:', req.body);

        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, msg: 'Not logged in' });
        }

        const { parentName, childName, contact, message } = req.body;

        // Validate all fields
        if (!parentName || !childName || !contact || !message) {
            return res.status(400).json({ success: false, msg: 'All fields are required' });
        }

        // Create feedback
        const newFeedback = new Feedback({
            parentName: parentName.trim(),
            childName: childName.trim(),
            contact: contact.trim(),
            message: message.trim()
        });

        await newFeedback.save();
        console.log('✅ Feedback saved to database:', newFeedback);

        res.json({
            success: true,
            msg: 'Feedback sent successfully! ✅',
            feedback: newFeedback
        });

    } catch (err) {
        console.error('❌ Error submitting feedback:', err);
        res.status(500).json({ success: false, msg: 'Server error', error: err.message });
    }
});

// ================== GET ALL FEEDBACKS (ADMIN ONLY) ==================
app.get('/api/getAllFeedbacks', async (req, res) => {
    try {
        console.log('📥 Fetching all feedbacks...');

        // Check if user is admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, msg: 'Access denied. Admins only.' });
        }

        const feedbacks = await Feedback.find().sort({ createdAt: -1 });

        console.log('✅ Feedbacks fetched:', feedbacks.length);

        res.json({
            success: true,
            feedbacks: feedbacks
        });

    } catch (err) {
        console.error('❌ Error fetching feedbacks:', err);
        res.status(500).json({ success: false, msg: 'Server error', error: err.message });
    }
});

// ================== DELETE FEEDBACK (ADMIN ONLY) ==================
app.delete('/api/deleteFeedback/:id', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, msg: 'Access denied. Admins only.' });
        }

        const feedbackId = req.params.id;

        await Feedback.findByIdAndDelete(feedbackId);
        console.log('✅ Feedback deleted:', feedbackId);

        res.json({
            success: true,
            msg: 'Feedback deleted successfully'
        });

    } catch (err) {
        console.error('❌ Error deleting feedback:', err);
        res.status(500).json({ success: false, msg: 'Server error', error: err.message });
    }
});



// ================== SUBMIT EXAM (STUDENTS ONLY) ==================

app.post('/api/submitExam', async (req, res) => {

    try {

        if (!req.session.user || req.session.user.role !== 'student') {
            return res.status(403).json({ msg: 'Access denied. Students only.' });
        }

        const { score, total, className } = req.body;   // ⭐ GET CLASS NAME

        const newResult = new ExamResult({

            studentId: req.session.user.id,
            studentName: req.session.user.name,

            className: className,   // ⭐ SAVE CLASS

            score: score,
            total: total

        });

        await newResult.save();

        res.json({
            success: true,
            msg: "Exam submitted successfully 🎉"
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ msg: "Server error" });

    }

});



// ================== GET ALL EXAM RESULTS (ADMIN) ==================
app.get('/api/getAllExamResults', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const results = await ExamResult.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            results
        });

    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});


// ================== GET LOGGED IN STUDENT ==================
app.get('/api/getStudent', (req, res) => {

    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ msg: 'Not logged in' });
    }

    res.json({
        success: true,
        student: {
            id: req.session.user.id,
            name: req.session.user.name
        }
    });

});


// ================== GET ALL EXAM RESULTS (ADMIN) ==================

app.get('/api/getExamResults', async (req, res) => {

    try {

        const results = await ExamResult.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            results: results
        });

    } catch (error) {

        console.error("Error fetching exam results:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});


// ================== WORK/PORTFOLIO ROUTES ==================

app.post("/api/uploadWork", upload.single("image"), async (req, res) => {

    if (!req.session.user) return res.status(401).json({ msg: "Login required" });

    try {

        const newWork = new Work({

            studentId: req.session.user.id,
            studentName: req.session.user.name,
            imageUrl: "/uploads/" + req.file.filename

        });

        await newWork.save();

        res.json({ success: true });

    } catch (err) { res.status(500).json({ success: false }); }

});

app.get("/api/getMyWork", async (req, res) => {

    if (!req.session.user) return res.status(401).json({ msg: "Login required" });

    try {

        const works = await Work.find({ studentId: req.session.user.id }).sort({ createdAt: -1 });

        res.json({ success: true, works });

    } catch (err) { res.status(500).json({ success: false }); }

});

app.delete("/api/deleteWork/:id", async (req, res) => {

    try {

        await Work.findByIdAndDelete(req.params.id);

        res.json({ success: true });

    } catch (err) { res.status(500).json({ success: false }); }

});


