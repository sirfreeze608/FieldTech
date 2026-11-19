import React, { useState, useEffect, useRef } from 'react';
import { useMessages, Message } from '../hooks/useMessages';
import { useChannels, Channel } from '../hooks/useChannels';
import { useStore } from '../store/useStore';
import { db, collection, addDoc, Timestamp } from '../lib/firebase';
import { Send, Hash, Users, Search, Plus, X, Lock, Globe, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Chat() {
  const { user } = useStore();
  const [activeChannelId, setActiveChannelId] = useState('general');
  const { channels, loading: loadingChannels } = useChannels(user?.orgCode, user?.uid);
  const { messages, loading: loadingMessages } = useMessages(activeChannelId, user?.orgCode);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'private'>('public');
  const [isCreating, setIsCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Default to general if none selected or if current one not in list
  useEffect(() => {
    if (!loadingChannels && channels.length > 0) {
      if (!channels.find(c => c.id === activeChannelId)) {
        setActiveChannelId(channels[0].id);
      }
    }
  }, [channels, loadingChannels, activeChannelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !user) return;

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'channels'), {
        name: newChannelName.trim(),
        type: newChannelType,
        orgCode: user.orgCode,
        createdBy: user.uid,
        memberIds: [user.uid], // Creator is always a member
        createdAt: Timestamp.now(),
      });
      setShowCreateModal(false);
      setNewChannelName('');
    } catch (err) {
      console.error("Failed to create channel:", err);
      alert("Failed to create channel. Only managers/dispatchers can create rooms.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const text = newMessage;
    setNewMessage('');

    await addDoc(collection(db, 'messages'), {
      text,
      orgCode: user.orgCode,
      senderId: user.uid,
      senderName: user.displayName,
      channelId: activeChannelId,
      createdAt: Timestamp.now(),
    });
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-neutral-100 p-4 bg-neutral-50/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
            {activeChannel?.type === 'private' ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
          </div>
          <div>
            <h2 className="text-sm font-bold">{activeChannel?.name || 'Loading...'}</h2>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
              {activeChannel?.type === 'private' ? 'Private Room' : 'Public Channel'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-lg">
            <Search className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="md:hidden p-2 text-neutral-900 hover:bg-neutral-100 rounded-lg"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex w-64 border-r border-neutral-100 p-4 flex-col justify-between">
          <div className="space-y-1 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Channels</span>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-900 transition-colors"
                title="Create Channel"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  activeChannelId === channel.id ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                {channel.type === 'private' ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-4 w-4" />}
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-neutral-50">
            <div className="bg-neutral-50 rounded-2xl p-3">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Organization</p>
              <p className="text-xs font-bold text-neutral-900">{user?.orgCode}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages || loadingChannels ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-900" />
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Loading Conversation</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center p-8">
                <div className="max-w-xs space-y-2">
                  <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <Hash className="h-6 w-6 text-neutral-400" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">Fresh Start</h3>
                  <p className="text-xs text-neutral-400">This channel is empty. Be the first to start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderId === user?.uid;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isSameSender = prevMsg?.senderId === msg.senderId;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSameSender ? 'mt-1' : 'mt-4'}`}>
                    {!isMe && !isSameSender && (
                      <span className="text-[10px] font-bold text-neutral-400 mb-1 ml-1">{msg.senderName}</span>
                    )}
                    <div className="group flex items-end gap-2">
                      {isMe && <span className="text-[9px] text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm transition-all ${
                        isMe ? 'bg-neutral-900 text-white rounded-tr-none' : 'bg-neutral-100 text-neutral-800 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      {!isMe && <span className="text-[9px] text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-neutral-100 p-4 bg-neutral-50/50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Message #${activeChannel?.name || '...'}`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-2xl border-neutral-200 bg-white px-4 py-3 text-sm focus:border-neutral-900 focus:ring-0 shadow-sm"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 z-50 border border-neutral-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">New Room</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateChannel} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">#</span>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. project-x-ops"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full pl-8 pr-4 py-3 rounded-2xl border-neutral-200 bg-neutral-50 text-sm focus:border-neutral-900 focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewChannelType('public')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        newChannelType === 'public' 
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-md' 
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      <Globe className="h-5 w-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChannelType('private')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        newChannelType === 'private' 
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-md' 
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      <Lock className="h-5 w-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Private</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 italic">
                    {newChannelType === 'public' 
                      ? "Anyone in your organization can join." 
                      : "Invite-only room for specific members."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!newChannelName.trim() || isCreating}
                  className="w-full py-4 rounded-2xl bg-neutral-900 text-white text-sm font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Channel
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
