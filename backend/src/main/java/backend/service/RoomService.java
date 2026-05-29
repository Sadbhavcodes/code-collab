package backend.service;

import backend.dto.SocketMessage;
import backend.model.Room;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;

public class RoomService {
    private Map<String, Room> rooms = new HashMap<>();

    public void joinRoom(String roomId, WebSocketSession session){
        rooms.putIfAbsent(roomId, new Room(roomId));
        Room room = rooms.get(roomId);

        if(!room.getSessions().contains(session)){
            room.getSessions().add(session);
        }
    }

    public void handleChat(SocketMessage socketMessage, WebSocketSession session){

    }
    if(Objects.equals(type, "JOIN")){
        String roomId = socketMessage.getRoomId();
        rooms.putIfAbsent(roomId, new ArrayList<>());
        if(!rooms.get(roomId).contains(session)){
            rooms.get(roomId).add(session);
        }

        sessionRooms.put(session, roomId);

        System.out.println(socketMessage.getSender() + " Joined Room " + roomId);
    }

            if(Objects.equals(type, "CHAT")){

        String jsonMessage = objectMapper.writeValueAsString(socketMessage);
        String roomId = sessionRooms.get(session);

        List<WebSocketSession> roomSessions = rooms.get(roomId);

        for(WebSocketSession s : roomSessions){
            s.sendMessage(new TextMessage(jsonMessage));
        }
    }
            if(Objects.equals(type, "LEAVE")){
        String roomId = sessionRooms.get(session);
        if(roomId != null){
            rooms.get(roomId).remove(session);
            sessionRooms.remove(session);

            if(rooms.get(roomId).isEmpty()){
                rooms.remove(roomId);
            }
            System.out.println(socketMessage.getSender() + "left the room");
        }
    }
}
