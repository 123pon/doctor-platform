import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const ChatWindow = ({ currentUserId, otherUserId, otherUserName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // 创建唯一的聊天频道名称（确保双方一致）
  const getChatChannelName = () => {
    const ids = [currentUserId, otherUserId].sort();
    return `chat:${ids[0]}:${ids[1]}`;
  };

  // 加载历史消息
  useEffect(() => {
    loadMessages();

    // 设置实时订阅
    setupRealtimeSubscription();

    return () => {
      // 清理订阅
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, otherUserId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channelName = getChatChannelName();

    // 创建私有频道
    const channel = supabase.channel(channelName, {
      config: { private: true } // 私有频道需要RLS授权
    });

    // 监听新消息事件
    channel
      .on('broadcast', { event: 'message_new' }, (payload) => {
        // 收到新消息，更新列表
        const newMsg = payload.payload.new;
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();

        // 如果当前用户是接收者，标记为已读（可选）
        if (newMsg.receiver_id === currentUserId) {
          markAsRead(newMsg.id);
        }
      })
      .subscribe((status) => {
        console.log('订阅状态:', status);
      });

    channelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const message = {
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: newMessage.trim(),
      is_read: false
    };

    try {
      // 直接插入数据库，触发器会自动广播
      const { error } = await supabase
        .from('messages')
        .insert([message]);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('发送失败:', error);
      alert('发送失败：' + error.message);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('receiver_id', currentUserId);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 如果是今天的消息，只显示时间
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 如果是昨天或更早，显示日期和时间
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-window">
      {/* 消息列表 */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <div className="loading-spinner small"></div>
            <p>加载消息中...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <p>暂无消息</p>
            <p>开始与 {otherUserName} 的对话吧！</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.sender_id === currentUserId ? 'own' : 'other'}`}
            >
              <div className="message-content">
                {msg.content}
              </div>
              <div className="message-meta">
                <span className="message-time">{formatTime(msg.created_at)}</span>
                {msg.sender_id === currentUserId && (
                  <span className={`message-status ${msg.is_read ? 'read' : 'sent'}`}>
                    {msg.is_read ? '已读' : '已发送'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`给 ${otherUserName} 发送消息...`}
            rows="1"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="send-button"
          >
            {sending ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;