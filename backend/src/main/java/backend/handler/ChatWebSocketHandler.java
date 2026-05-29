package backend.handler;

import backend.dto.SocketMessage;
import backend.service.RoomService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {
    private RoomService roomService;
    public ChatWebSocketHandler(RoomService roomService){
        this.roomService = roomService;
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
            switch (type){
                case "JOIN":
                    roomService.joinRoom(socketMessage.getRoomId(), session);
                    break;

                case "CHAT":
                    roomService.handleChat(socketMessage, session);
                    break;

                case "LEAVE":
                    roomService.leaveRoom(socketMessage.getRoomId(), session);
                    break;
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