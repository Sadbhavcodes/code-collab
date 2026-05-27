package backend.handler;

import backend.dto.SocketMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {
    public ChatWebSocketHandler(){
        System.out.println("HANDLER CREATED");
    }

    private final Map<String, List<WebSocketSession>> rooms = new HashMap<>();
    private final Map<WebSocketSession, String> sessionRooms = new HashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session)
            throws Exception{
        System.out.println("New user connected");
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message)
            throws Exception{
        try{
            SocketMessage socketMessage = objectMapper.readValue(
                    message.getPayload(),
                    SocketMessage.class
            );
            String type = socketMessage.getType();
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
        } catch (Exception e){
            System.out.println("PARSING ERROR!");
            e.printStackTrace();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status)
            throws Exception{
        String roomId = sessionRooms.get(session);
        if(roomId != null){
            rooms.get(roomId).remove(session);
            sessionRooms.remove(session);
            if(rooms.get(roomId).isEmpty()){
                rooms.remove(roomId);
            }
        }
        System.out.println("User disconnected");

    }
}