package backend.service;

import backend.dto.SocketMessage;
import backend.model.ChatMessage;
import backend.model.Room;
import backend.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;

@Service
public class RoomService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Room> rooms = new HashMap<>();
    private final Map<WebSocketSession, String> sessionRooms = new HashMap<>();
    private final Map<WebSocketSession, User> users = new HashMap<>();

    public void joinRoom(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        String roomId = socketMessage.getRoomId();
        System.out.println("User joining room: " + roomId);
        rooms.putIfAbsent(roomId, new Room(roomId));
        Room room = rooms.get(roomId);

        if (!room.getSessions().contains(session)) {
            room.getSessions().add(session);
            sessionRooms.put(session, roomId);
            User user = socketMessage.getUser();
            if (user == null && socketMessage.getSender() != null) {
                user = new User(UUID.randomUUID().toString());
                user.setUsername(socketMessage.getSender());
            }
            users.put(session, user);
            System.out.println("Session added to room. Sending ROOM_STATE and ROOM_USERS...");
            if (user != null) {
                System.out.println(user.getUsername() + " joined the room");
            }
            sendCurrentRoomState(session, room);
            broadcastRoomUsers(room);
        } else {
            System.out.println("Session already in room");
        }
    }

    public void handleChat(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        ChatMessage message = new ChatMessage();
        String senderName = null;
        if (socketMessage.getUser() != null) {
            senderName = socketMessage.getUser().getUsername();
        }
        if (senderName == null) {
            senderName = socketMessage.getSender();
        }
        if (senderName == null) {
            User sessionUser = users.get(session);
            senderName = sessionUser != null ? sessionUser.getUsername() : "Unknown";
        }
        message.setSender(senderName);
        message.setContent(socketMessage.getContent());

        String roomId = sessionRooms.get(session);
        Room room = rooms.get(roomId);
        room.getMessages().add(message);
        String jsonMessage = objectMapper.writeValueAsString(message);

        for (WebSocketSession s : room.getSessions()) {
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(jsonMessage));
            }
        }
    }

    public void leaveRoom(String roomId, WebSocketSession session) {
        System.out.println("Removing session " + session.getId());
        if (!rooms.containsKey(roomId)) {
            return;
        }

        Room room = rooms.get(roomId);
        User user = users.get(session);

        room.getSessions().remove(session);
        sessionRooms.remove(session);
        users.remove(session);

        if (user != null) {
            System.out.println(user.getUsername() + " left the room");
        }

        if (room.getSessions().isEmpty()) {
            rooms.remove(roomId);
        } else {
            try {
                broadcastRoomUsers(room);
            } catch (IOException e) {
                System.out.println("Failed to broadcast ROOM_USERS after leave: " + e.getMessage());
            }
        }
    }

    public void handleDisconnect(WebSocketSession session) {
        String roomId = sessionRooms.get(session);

        if (roomId == null) {
            return;
        }
        leaveRoom(roomId, session);
    }

    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public void sendCurrentRoomState(WebSocketSession session, Room room) throws IOException {
        System.out.println("Sending ROOM_STATE to session " + session.getId());

        SocketMessage socketMessage = new SocketMessage();
        socketMessage.setType("ROOM_STATE");
        socketMessage.setCodeEditorState(room.getCodeEditorState());
        socketMessage.setMessages(room.getMessages());

        // Send the full ordered list of Yjs updates so the late-joining client
        // can replay them all via Y.applyUpdate and arrive at the correct state.
        if (room.getCodeEditorState() != null) {
            socketMessage.setYjsUpdates(room.getCodeEditorState().getYjsUpdates());
        }

        String json = objectMapper.writeValueAsString(socketMessage);
        session.sendMessage(new TextMessage(json));
    }

    private List<User> getRoomUsers(Room room) {
        List<User> currentUsers = new ArrayList<>();
        for (WebSocketSession session : room.getSessions()) {
            User user = users.get(session);
            if (user != null) {
                currentUsers.add(user);
            }
        }
        return currentUsers;
    }

    public void broadcastRoomUsers(Room room) throws IOException {
        List<User> currentUsers = getRoomUsers(room);
        System.out.println("Broadcasting ROOM_USERS to room " + room.getRoomId() + ", users=" + currentUsers.size());

        SocketMessage socketMessage = new SocketMessage();
        socketMessage.setType("ROOM_USERS");
        socketMessage.setUsers(currentUsers);

        String json = objectMapper.writeValueAsString(socketMessage);
        for (WebSocketSession session : room.getSessions()) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        }
    }
}