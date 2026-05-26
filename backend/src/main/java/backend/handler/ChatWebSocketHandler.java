package backend.handler;

import backend.dto.SocketMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {
    public ChatWebSocketHandler(){
        System.out.println("HANDLER CREATED");
    }

    private final List<WebSocketSession> sessions = new ArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session)
            throws Exception{
        sessions.add(session);
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
            System.out.println(socketMessage.getSender());
            System.out.println(socketMessage.getContent());

            String jsonMessage = objectMapper.writeValueAsString(socketMessage);

            for(WebSocketSession s : sessions){
                s.sendMessage(new TextMessage(jsonMessage));
            }
        } catch (Exception e){
            System.out.println("PARSING ERROR!");
            e.printStackTrace();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status)
            throws Exception{
        sessions.remove(session);
        System.out.println("User disconnected");
    }

}