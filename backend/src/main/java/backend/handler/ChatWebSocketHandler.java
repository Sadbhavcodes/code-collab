package backend.handler;

import backend.dto.SocketMessage;
import backend.service.CodeEditorService;
import backend.service.RoomService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private RoomService roomService;
    private CodeEditorService codeEditorService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatWebSocketHandler(RoomService roomService, CodeEditorService codeEditorService){
        this.roomService = roomService;
        this.codeEditorService = codeEditorService;
        System.out.println("HANDLER CREATED");
    }

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
                    roomService.joinRoom(socketMessage, session);
                    break;

                case "CHAT":
                    roomService.handleChat(socketMessage,session);
                    break;

                case "LEAVE":
                    roomService.leaveRoom(socketMessage.getRoomId(), session);
                    break;

                case "CODE-CHANGE":
                    codeEditorService.handleCodeChange(socketMessage,session);
                    break;
                case "CURSOR_MOVE":
                    codeEditorService.handleCursorMove(socketMessage,session);
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
        roomService.handleDisconnect(session);
        System.out.println("User disconnected");

    }
}