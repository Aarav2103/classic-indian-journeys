import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// A real (throwaway) bcrypt hash used to run a comparison even when the email
// doesn't exist, so login takes roughly the same time whether or not an account
// is found, closing the timing side-channel for user enumeration.
const DUMMY_HASH = '$2b$10$/adixFolyhY/h7cCuGd1g.m5fW6l/WWybW7PcVcA4oy.8/Sc1WX4i';

export const registerUser = async (req, res) => {
  const { username, email, password, photo } = req.body;

  try {
    // Generic conflict, don't reveal which of the two fields is taken
    // (keeps register consistent with the enumeration-hardened login).
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'Email or username already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword, photo });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to register user' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Look the user up by email. To avoid leaking which emails are registered
    // (user enumeration), return the SAME generic 401 whether the account is
    // missing or the password is wrong, and run a dummy compare in the missing
    // case so both paths take comparable time.
    const user = await User.findOne({ email });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15d' });

    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to login' });
  }
};

export default { registerUser, loginUser };