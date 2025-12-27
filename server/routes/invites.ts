import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { 
  InviteRequest, 
  SendInviteRequest, 
  SendInviteResponse, 
  InviteRequestResponse,
  InviteRequestResponseResult,
  InviteNotification
} from "@shared/api";
import { verifyToken, getUserById } from "./auth";

// In-memory storage for demo (in production, use a real database)
const inviteRequests: Map<string, InviteRequest> = new Map();
const userInviteCodes: Map<string, string> = new Map(); // code -> userId

// Middleware to authenticate requests
const authenticateUser = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  const user = getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: "User not found" });
  }

  req.user = user;
  next();
};

// Helper function to generate a unique 8-character invite code
const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const handleSendInviteRequest: RequestHandler = (req: any, res) => {
  try {
    const senderId = req.user.id;
    const { code }: SendInviteRequest = req.body;

    if (!code) {
      const response: SendInviteResponse = {
        success: false,
        message: "Invite code is required",
      };
      return res.status(400).json(response);
    }

    // Find the user with this invite code
    const receiverId = userInviteCodes.get(code.toUpperCase());
    if (!receiverId) {
      const response: SendInviteResponse = {
        success: false,
        message: "Invalid invite code",
      };
      return res.status(404).json(response);
    }

    // Check if user is trying to invite themselves
    if (receiverId === senderId) {
      const response: SendInviteResponse = {
        success: false,
        message: "You cannot invite yourself",
      };
      return res.status(400).json(response);
    }

    // Check if invite request already exists
    const existingRequest = Array.from(inviteRequests.values()).find(
      r => r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending'
    );

    if (existingRequest) {
      const response: SendInviteResponse = {
        success: false,
        message: "Invite request already sent",
      };
      return res.status(409).json(response);
    }

    // Get sender info
    const sender = getUserById(senderId);
    if (!sender) {
      const response: SendInviteResponse = {
        success: false,
        message: "Sender not found",
      };
      return res.status(404).json(response);
    }

    // Create invite request
    const requestId = uuidv4();
    const inviteRequest: InviteRequest = {
      id: requestId,
      senderId,
      senderEmail: sender.email,
      senderUsername: sender.username || sender.email.split('@')[0],
      receiverId,
      code,
      timestamp: new Date().toISOString(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    inviteRequests.set(requestId, inviteRequest);

    const response: SendInviteResponse = {
      success: true,
      requestId,
      message: "Invite request sent successfully",
    };

    res.json(response);

    // Trigger WebSocket event to notify the receiver (if online)
    console.log(`Invite request sent from ${sender.email} to user ${receiverId}`);

    // Note: WebSocket integration would go here - we'll rely on the frontend to poll for requests
    // In a complete implementation, we'd emit to the receiver's socket here
  } catch (error) {
    console.error("Send invite request error:", error);
    const response: SendInviteResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleRespondToInviteRequest: RequestHandler = (req: any, res) => {
  try {
    const userId = req.user.id;
    const { requestId, response: userResponse }: InviteRequestResponse = req.body;

    if (!requestId || !userResponse) {
      const response: InviteRequestResponseResult = {
        success: false,
        message: "Request ID and response are required",
      };
      return res.status(400).json(response);
    }

    // Find the invite request
    const inviteRequest = inviteRequests.get(requestId);
    if (!inviteRequest) {
      const response: InviteRequestResponseResult = {
        success: false,
        message: "Invite request not found",
      };
      return res.status(404).json(response);
    }

    // Check if user is the receiver
    if (inviteRequest.receiverId !== userId) {
      const response: InviteRequestResponseResult = {
        success: false,
        message: "Unauthorized to respond to this request",
      };
      return res.status(403).json(response);
    }

    // Check if request is still pending
    if (inviteRequest.status !== 'pending') {
      const response: InviteRequestResponseResult = {
        success: false,
        message: "Request has already been responded to",
      };
      return res.status(410).json(response);
    }

    // Check if request has expired
    if (new Date(inviteRequest.expiresAt) <= new Date()) {
      inviteRequests.delete(requestId);
      const response: InviteRequestResponseResult = {
        success: false,
        message: "Request has expired",
      };
      return res.status(410).json(response);
    }

    // Update request status
    inviteRequest.status = userResponse === 'accept' ? 'accepted' : 'rejected';

    let responseResult: InviteRequestResponseResult;

    if (userResponse === 'accept') {
      // Get sender info for contact creation
      const sender = getUserById(inviteRequest.senderId);
      responseResult = {
        success: true,
        message: "Invite request accepted",
        contactInfo: {
          id: inviteRequest.senderId,
          email: inviteRequest.senderEmail,
          username: inviteRequest.senderUsername,
        },
      };
    } else {
      responseResult = {
        success: true,
        message: "Invite request rejected",
      };
    }

    res.json(responseResult);

    // Note: In a real app, this would trigger a WebSocket event to the sender
    console.log(`Invite request ${userResponse} by user ${userId}`);
  } catch (error) {
    console.error("Respond to invite request error:", error);
    const response: InviteRequestResponseResult = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleGetInviteRequests: RequestHandler = (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get all pending invite requests for this user
    const userRequests = Array.from(inviteRequests.values()).filter(
      r => r.receiverId === userId && r.status === 'pending'
    );

    // Filter out expired requests
    const now = new Date();
    const validRequests = userRequests.filter(r => new Date(r.expiresAt) > now);

    // Remove expired requests from storage
    userRequests.forEach(r => {
      if (new Date(r.expiresAt) <= now) {
        inviteRequests.delete(r.id);
      }
    });

    res.json({ success: true, requests: validRequests });
  } catch (error) {
    console.error("Get invite requests error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const handleRegisterInviteCode: RequestHandler = (req: any, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    // Store or update user's invite code
    userInviteCodes.set(code.toUpperCase(), userId);

    res.json({ success: true, message: "Invite code registered" });
  } catch (error) {
    console.error("Register invite code error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Export middleware for use in other routes
export { authenticateUser };

// Export helper functions for WebSocket usage
export const getInviteRequestsForUser = (userId: string): InviteRequest[] => {
  return Array.from(inviteRequests.values()).filter(
    r => r.receiverId === userId && r.status === 'pending'
  );
};

export const findUserByInviteCode = (code: string): string | null => {
  return userInviteCodes.get(code.toUpperCase()) || null;
};
