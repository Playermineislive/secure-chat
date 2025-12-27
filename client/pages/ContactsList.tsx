import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useContacts, Contact, Group } from "../contexts/ContactContext";
import { InviteNotification } from "@shared/api";
import InviteRequestCard from "../components/InviteRequestCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProfileSettings from "../components/ProfileSettings";
import ContactRename from "../components/ContactRename";
import {
  Users,
  Search,
  Plus,
  MessageCircle,
  UserPlus,
  Copy,
  Check,
  QrCode,
  Shield,
  Star,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  ArrowLeft,
  MoreVertical,
  Heart,
  Crown,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle,
  Edit2,
  User,
} from "lucide-react";

interface ContactsListProps {
  onSelectContact: (contact: Contact) => void;
  onCreateGroup: (contacts: Contact[]) => void;
  onBack: () => void;
}

export default function ContactsList({
  onSelectContact,
  onCreateGroup,
  onBack,
}: ContactsListProps) {
  const { user } = useAuth();
  const {
    contacts,
    groups,
    pendingRequests,
    inviteRequests,
    inviteNotifications,
    currentInviteCode,
    userProfile,
    generateNewInviteCode,
    addFriendByCode,
    sendInviteByCode,
    acceptInviteRequest,
    rejectInviteRequest,
    addInviteRequest,
    clearNotification,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    searchContacts,
    getFavoriteContacts,
    getOnlineContacts,
    getRecentContacts,
    createGroup,
    renameContact,
    isLoading,
    error,
  } = useContacts();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "contacts" | "groups" | "invites" | "requests"
  >("contacts");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [filterBy, setFilterBy] = useState<
    "all" | "online" | "favorites" | "recent"
  >("all");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showQRCode, setShowQRCode] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [addFriendCode, setAddFriendCode] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [renamingContact, setRenamingContact] = useState<Contact | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getFilteredContacts = () => {
    let filteredContacts = contacts;

    if (searchQuery) {
      filteredContacts = searchContacts(searchQuery);
    } else {
      switch (filterBy) {
        case "online":
          filteredContacts = getOnlineContacts();
          break;
        case "favorites":
          filteredContacts = getFavoriteContacts();
          break;
        case "recent":
          filteredContacts = getRecentContacts();
          break;
        default:
          filteredContacts = contacts;
      }
    }

    return filteredContacts;
  };

  const filteredContacts = getFilteredContacts();
  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectContact = (contact: Contact) => {
    if (isSelectionMode) {
      setSelectedContacts((prev) =>
        prev.includes(contact.id)
          ? prev.filter((id) => id !== contact.id)
          : [...prev, contact.id],
      );
    } else {
      onSelectContact(contact);
    }
  };

  const handleCreateGroup = () => {
    const selectedContactObjects = contacts.filter((c) =>
      selectedContacts.includes(c.id),
    );
    if (selectedContactObjects.length >= 1) {
      const newGroup = createGroup(
        `Group with ${selectedContactObjects.map((c) => c.username || c.email).join(", ")}`,
        selectedContactObjects,
      );
      onCreateGroup(selectedContactObjects);
      setIsSelectionMode(false);
      setSelectedContacts([]);
    }
  };

  const copyInviteCode = async () => {
    if (!currentInviteCode) return;

    try {
      await navigator.clipboard.writeText(currentInviteCode.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const handleAddFriendByCode = async () => {
    if (!addFriendCode.trim()) return;

    const success = await sendInviteByCode(addFriendCode);

    if (success) {
      setAddFriendCode("");
      setSuccessMessage("Invite request sent! Waiting for response...");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!newFriendEmail.trim()) return;

    const success = await sendFriendRequest(newFriendEmail);
    if (success) {
      setNewFriendEmail("");
      setSuccessMessage("Friend request sent!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const tabs = [
    { id: "contacts", label: "Contacts", icon: Users, count: contacts.length },
    {
      id: "groups",
      label: "Groups",
      icon: MessageCircle,
      count: groups.length,
    },
    {
      id: "requests",
      label: "Requests",
      icon: UserPlus,
      count: pendingRequests.length + inviteRequests.length,
    },
    { id: "invites", label: "Invite", icon: UserPlus, count: 0 },
  ] as const;

  const filters = [
    { id: "all", label: "All", icon: Users },
    { id: "online", label: "Online", icon: Wifi },
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "recent", label: "Recent", icon: Clock },
  ] as const;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 relative overflow-hidden">
      {/* Header */}
      <motion.header
        className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <motion.button
              onClick={onBack}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-[1rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center space-x-3">
              <motion.div
                onClick={() => setShowProfileSettings(true)}
                className="cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Avatar className="w-12 h-12 border-2 border-white/20">
                  <AvatarImage src={userProfile?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white font-bold">
                    {userProfile?.username?.charAt(0) ||
                      userProfile?.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold text-white">SecureChat</h1>
                <p className="text-white/70 text-sm">
                  {isOnline
                    ? `${getOnlineContacts().length} online`
                    : "Offline"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
                isSelectionMode
                  ? "bg-blue-500/30 text-blue-300"
                  : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Create Group"
            >
              <Plus className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => setShowAddFriend(!showAddFriend)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-[1rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Add Friend"
            >
              <UserPlus className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => setShowProfileSettings(true)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-[1rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Profile Settings"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Quick add friend panel */}
        <AnimatePresence>
          {showAddFriend && (
            <motion.div
              className="bg-white/5 border-t border-white/10 p-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter friend's email"
                    value={newFriendEmail}
                    onChange={(e) => setNewFriendEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-[1.5rem] flex-1"
                    type="email"
                  />
                  <Button
                    onClick={handleSendFriendRequest}
                    disabled={!newFriendEmail.trim() || isLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-[1.5rem]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center text-white/60 text-sm">
                  <div className="flex-1 h-px bg-white/20"></div>
                  <span className="px-3">or use invite code</span>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter invite code"
                    value={addFriendCode}
                    onChange={(e) =>
                      setAddFriendCode(e.target.value.toUpperCase())
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-[1.5rem] flex-1 uppercase tracking-wider text-center"
                    maxLength={8}
                  />
                  <Button
                    onClick={handleAddFriendByCode}
                    disabled={!addFriendCode.trim() || isLoading}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-[1.5rem]"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
            <Input
              placeholder="Search contacts, groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-[1.5rem] pl-10 backdrop-blur-sm focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center space-x-2 px-4 pb-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-[1.5rem] transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 text-white shadow-lg"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-white text-xs"
                  >
                    {tab.count}
                  </Badge>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Filters for contacts tab */}
        {activeTab === "contacts" && (
          <motion.div
            className="flex items-center space-x-2 px-4 pb-4 overflow-x-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filters.map((filter) => {
              const isActive = filterBy === filter.id;
              return (
                <motion.button
                  key={filter.id}
                  onClick={() => setFilterBy(filter.id as any)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-[1rem] transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <filter.icon className="w-3 h-3" />
                  <span className="text-xs">{filter.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Success/Error Messages */}
        <AnimatePresence>
          {(successMessage || error) && (
            <motion.div
              className="px-4 pb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert
                className={`${
                  successMessage
                    ? "bg-green-500/20 border-green-400/50 text-green-300"
                    : "bg-red-500/20 border-red-400/50 text-red-300"
                } backdrop-blur-sm rounded-[1.5rem]`}
              >
                {successMessage ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <AlertDescription>{successMessage || error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === "contacts" && (
              <motion.div
                key="contacts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {filteredContacts.map((contact, index) => {
                  const isSelected = selectedContacts.includes(contact.id);
                  return (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={`bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? "ring-2 ring-blue-400/50 bg-blue-500/20"
                            : ""
                        }`}
                        onClick={() => handleSelectContact(contact)}
                      >
                        <CardContent className="p-4 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-[1.5rem] flex items-center justify-center text-white font-semibold text-lg border-2 border-white/20">
                                  {contact.username?.charAt(0) ||
                                    contact.email.charAt(0).toUpperCase()}
                                </div>
                                <motion.div
                                  className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(contact.status)} rounded-full border-2 border-white`}
                                  animate={
                                    contact.isOnline
                                      ? { scale: [1, 1.2, 1] }
                                      : {}
                                  }
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-white font-medium truncate">
                                    {contact.displayName ||
                                      contact.username ||
                                      contact.email}
                                  </h3>
                                  {contact.isFavorite && (
                                    <Heart className="w-4 h-4 text-red-400 fill-current" />
                                  )}
                                  {contact.displayName && (
                                    <Edit2 className="w-3 h-3 text-white/50" />
                                  )}
                                </div>

                                <p className="text-white/60 text-sm truncate">
                                  {contact.lastMessage?.content ||
                                    contact.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end space-y-2">
                              {contact.unreadCount! > 0 && (
                                <motion.div
                                  className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  <span className="text-white text-xs font-bold">
                                    {contact.unreadCount}
                                  </span>
                                </motion.div>
                              )}

                              {!isSelectionMode && (
                                <motion.button
                                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all duration-200"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingContact(contact);
                                  }}
                                  title="Rename Contact"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}

                {filteredContacts.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h3 className="text-white text-lg font-medium mb-2">
                      No contacts found
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      {searchQuery
                        ? "Try adjusting your search"
                        : "Start by adding some friends"}
                    </p>
                    <Button
                      onClick={() => setShowAddFriend(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Friends
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === "requests" && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Invite Requests Section */}
                {inviteRequests.length > 0 && (
                  <div className="space-y-4">
                    <motion.h3
                      className="text-white font-semibold text-xl flex items-center space-x-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                      <span>Invite Requests</span>
                      <Badge
                        variant="outline"
                        className="bg-blue-500/20 border-blue-400/50 text-blue-300"
                      >
                        {inviteRequests.length}
                      </Badge>
                    </motion.h3>

                    <div className="space-y-4">
                      {inviteRequests.map((request, index) => (
                        <InviteRequestCard
                          key={request.id}
                          request={request}
                          onAccept={acceptInviteRequest}
                          onReject={rejectInviteRequest}
                          onView={(req) => console.log("View request:", req)}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Friend Requests Section */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-white font-medium text-lg">
                      Friend Requests
                    </h3>
                    {pendingRequests.map((request, index) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-[1.5rem] flex items-center justify-center text-white font-semibold text-lg border-2 border-white/20">
                                  {request.username?.charAt(0) ||
                                    request.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="text-white font-medium">
                                    {request.username || request.email}
                                  </h4>
                                  <p className="text-white/60 text-sm">
                                    {request.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex space-x-2">
                                <motion.button
                                  onClick={() =>
                                    acceptFriendRequest(request.id)
                                  }
                                  className="w-10 h-10 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-[1rem] flex items-center justify-center text-green-400 hover:text-green-300 transition-all duration-200"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  title="Accept"
                                >
                                  <Check className="w-5 h-5" />
                                </motion.button>

                                <motion.button
                                  onClick={() =>
                                    rejectFriendRequest(request.id)
                                  }
                                  className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-[1rem] flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-200"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  title="Reject"
                                >
                                  <AlertCircle className="w-5 h-5" />
                                </motion.button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {pendingRequests.length === 0 &&
                  inviteRequests.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12"
                    >
                      <UserPlus className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <h3 className="text-white text-lg font-medium mb-2">
                        No pending requests
                      </h3>
                      <p className="text-white/60 text-sm">
                        You'll see invite and friend requests here
                      </p>
                    </motion.div>
                  )}
              </motion.div>
            )}

            {activeTab === "invites" && (
              <motion.div
                key="invites"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden">
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-white flex items-center space-x-2">
                      <QrCode className="w-5 h-5" />
                      <span>Your Invite Code</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="bg-white/10 rounded-[1.5rem] p-4 text-center">
                      <div className="text-3xl font-bold text-white tracking-wider mb-2">
                        {currentInviteCode?.code || "LOADING..."}
                      </div>
                      <p className="text-white/60 text-sm">
                        Share this code with friends to connect securely
                      </p>
                      <p className="text-white/50 text-xs mt-2">
                        Code refreshes daily
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={copyInviteCode}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        variant="outline"
                        disabled={!currentInviteCode}
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={generateNewInviteCode}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        New Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <AnimatePresence>
        {showProfileSettings && (
          <ProfileSettings onClose={() => setShowProfileSettings(false)} />
        )}
      </AnimatePresence>

      {/* Contact Rename Modal */}
      <AnimatePresence>
        {renamingContact && (
          <ContactRename
            contact={renamingContact}
            onRename={renameContact}
            onClose={() => setRenamingContact(null)}
          />
        )}
      </AnimatePresence>

      {/* Invite Notifications Overlay */}
      <AnimatePresence>
        {inviteNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -50, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <Card
              className={`border-2 ${
                notification.type === "invite_request"
                  ? "bg-blue-500/20 border-blue-400/50 backdrop-blur-xl"
                  : notification.type === "invite_accepted"
                    ? "bg-green-500/20 border-green-400/50 backdrop-blur-xl"
                    : "bg-red-500/20 border-red-400/50 backdrop-blur-xl"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === "invite_request"
                          ? "bg-blue-500/30 text-blue-300"
                          : notification.type === "invite_accepted"
                            ? "bg-green-500/30 text-green-300"
                            : "bg-red-500/30 text-red-300"
                      }`}
                    >
                      {notification.type === "invite_request" && (
                        <UserPlus className="w-5 h-5" />
                      )}
                      {notification.type === "invite_accepted" && (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      {notification.type === "invite_rejected" && (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4
                        className={`font-medium text-sm ${
                          notification.type === "invite_request"
                            ? "text-blue-200"
                            : notification.type === "invite_accepted"
                              ? "text-green-200"
                              : "text-red-200"
                        }`}
                      >
                        {notification.type === "invite_request" &&
                          "New Invite Request"}
                        {notification.type === "invite_accepted" &&
                          "Invite Accepted!"}
                        {notification.type === "invite_rejected" &&
                          "Invite Declined"}
                      </h4>
                      <p className="text-white/80 text-xs mt-1">
                        {notification.message}
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        From:{" "}
                        {notification.senderUsername ||
                          notification.senderEmail}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => clearNotification(notification.id)}
                    className="text-white/50 hover:text-white/80 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
