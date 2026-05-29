package backend.service;

import backend.dto.SocketMessage;
import backend.model.ChatMessage;
import backend.model.Room;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;

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

    public void handleChat(SocketMessage socketMessage) throws IOException {
        ChatMessage message = new ChatMessage();
        message.setSender(socketMessage.getSender());
        message.setContent(socketMessage.getContent());

        Room room = rooms.get(socketMessage.getRoomId());

        room.getMessages().add(message);
        String jsonMessage = objectMapper.writeValueAsString(message);

        for(WebSocketSession s: room.getSessions()){
            s.sendMessage(new TextMessage(jsonMessage));
        }
    }

    public void leaveRoom(String roomId, WebSocketSession session){
        try{
            if(rooms.containsKey(roomId)){
                Room room = rooms.get(roomId);
                if(room.getSessions().isEmpty()){
                    room.getSessions().remove(session);

                    sessionRooms.remove(session);
                }
            }
        } catch (Exception e){
            System.out.println("Such room does not exist");
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
