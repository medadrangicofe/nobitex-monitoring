/**
 * مدیریت سابسکرایب فرانت‌اند
 * io = Socket.io instance
 */
export function subscriptionManager(io) {
  io.on('connection', (socket) => {
    console.log('Frontend subscribed:', socket.id);

    // دریافت درخواست داده‌ها از فرانت‌اند
    socket.on('request:data', (payload) => {
      console.log('Data requested by frontend:', payload);
    });

    socket.on('disconnect', () => {
      console.log('Frontend disconnected:', socket.id);
    });
  });
}