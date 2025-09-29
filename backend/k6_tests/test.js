//k6 run backend/k6_tests/test.js 
//run test script

import ws from 'k6/ws';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const messageLatency = new Trend('message_latency');

// Config
export const options = {
  stages: [
    { duration: '30s', target: 1000 },
    { duration: '2m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    message_latency: ['p(95)<500'],
  },
};

const WS_URL = 'ws://localhost:8080/ws';
const rooms = Array.from({ length: 100 }, (_, i) => `room_${i + 1}`);
const usersPerRoom = 10;

export default function () {
  const vuID = __VU;
  const roomIndex = Math.floor((vuID - 1) / usersPerRoom);
  const username = `user_${vuID}`;
  const roomID = rooms[roomIndex];

  const url = `${WS_URL}?roomID=${roomID}&username=${username}`;
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      console.log(`User ${username} connected to ${roomID}`);

      socket.setInterval(() => {
        const message = JSON.stringify({
          text: `Message from ${username} at ${new Date().toISOString()}`,
        });

        const start = new Date().getTime();
        socket.send(message);

        socket.on('message', (msg) => {
          const end = new Date().getTime();
          messageLatency.add(end - start);
        });
      }, 1000);
    });

    socket.on('error', (e) => {
      console.error(`Error for ${username} in room ${roomID}: ${e}`);
    });

    socket.on('close', () => {
      console.log(`User ${username} disconnected from ${roomID}`);
    });
  });

  check(res, {
    'Connected successfully': (r) => r && r.status === 101,
  });
}
