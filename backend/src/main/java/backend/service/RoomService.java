package backend.service;

import backend.dto.SocketMessage;
import backend.model.ChatMessage;
import backend.model.Room;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;

@Service
public class RoomService {
    private ObjectMapper objectMapper = new ObjectMapper();
    private Map<String, Room> rooms = new HashMap<>();
    private Map<WebSocketSession, String> sessionRooms = new HashMap<>();

    public void joinRoom(String roomId, WebSocketSession session){
        rooms.putIfAbsent(roomId, new Room(roomId));
        Room room = rooms.get(roomId);

        if(!room.getSessions().contains(session)){
            room.getSessions().add(session);

            sessionRooms.put(session, roomId);
        }
    }

    public void handleChat(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        ChatMessage message = new ChatMessage();
        message.setSender(socketMessage.getSender());
        message.setContent(socketMessage.getContent());

        String roomId = sessionRooms.get(session);
        Room room = rooms.get(roomId);
        room.getMessages().add(message);
        String jsonMessage = objectMapper.writeValueAsString(message);

        for(WebSocketSession s: room.getSessions()){
            if(s.isOpen()){
                s.sendMessage(new TextMessage(jsonMessage));
            }
        }
    }

    public void leaveRoom(String roomId, WebSocketSession session){
        System.out.println("Removing session " + session.getId());
        if(!rooms.containsKey(roomId)){
            return;
        }

        Room room = rooms.get(roomId);

        room.getSessions().remove(session);

        sessionRooms.remove(session);

        if(room.getSessions().isEmpty()){
            rooms.remove(roomId);
        }
    }

    public void handleDisconnect(WebSocketSession session){
        String roomId = sessionRooms.get(session);

        if(roomId == null){
            return;
        }
        leaveRoom(roomId, session);
    }
}
