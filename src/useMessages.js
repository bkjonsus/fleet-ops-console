import { useTable } from "./useTable";

// Messages for one driver's thread, real-time-ish via the same polling/refetch
// useTable already does. sender is "driver" or "dispatch".
export function useDriverMessages(driverId, companyId) {
  const { rows: messages, loading, error, insert, update, refresh } = useTable("driver_messages", "created_at", true, companyId);

  const myMessages = driverId ? messages.filter((m) => m.driver_id === driverId) : [];

  function sendMessage(sender, senderName, text) {
    if (!text.trim() || !driverId) return;
    return insert({ driver_id: driverId, sender, sender_name: senderName, message: text.trim() });
  }

  function markThreadRead(fromSender) {
    const unread = myMessages.filter((m) => m.sender === fromSender && !m.read);
    unread.forEach((m) => update(m.id, { read: true }));
  }

  return { messages: myMessages, loading, error, sendMessage, markThreadRead, refresh };
}
