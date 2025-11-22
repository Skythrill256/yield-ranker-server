import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token verification failed' 
    });
  }
};

router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Preferences object is required' 
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('preferences')
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save preferences',
        error: error.message 
      });
    }

    res.json({
      success: true,
      preferences: data.preferences
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({
          success: true,
          preferences: null
        });
      }
      
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load preferences',
        error: error.message 
      });
    }

    res.json({
      success: true,
      preferences: data?.preferences || null
    });
  } catch (error) {
    console.error('Error loading preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;


