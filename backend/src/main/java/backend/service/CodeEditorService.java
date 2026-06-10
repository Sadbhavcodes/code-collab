package backend.service;

import backend.dto.SocketMessage;
import backend.model.CodeEditorState;
import backend.model.Room;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

@Service
public class CodeEditorService {
    private final RoomService roomService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CodeEditorService(RoomService roomService) {
        this.roomService = roomService;
    }

    public void handleYjsUpdate(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        Room room = roomService.getRoom(socketMessage.getRoomId());
        if (room == null) return;

        // Lazily create state holder
        if (room.getCodeEditorState() == null) {
            room.setCodeEditorState(new CodeEditorState());
        }
        CodeEditorState state = room.getCodeEditorState();

        // Keep a plain-text snapshot for human-readable fallback / debugging
        if (socketMessage.getCode() != null) {
            state.setCode(socketMessage.getCode());
        }

        // Store each raw Yjs update individually so late joiners can apply the
        // full ordered history via Y.applyUpdate. Yjs CRDT handles deduplication
        // on the client — we must NOT concatenate the raw bytes here because
        // that produces a corrupted document state.
        if (socketMessage.getUpdate() != null) {
            state.getYjsUpdates().add(socketMessage.getUpdate());
        }

        // Relay the raw update to every other open session in the room
        SocketMessage response = new SocketMessage();
        response.setType("YJS_UPDATE");
        response.setRoomId(socketMessage.getRoomId());
        response.setSender(socketMessage.getSender());
        response.setUpdate(socketMessage.getUpdate());
        response.setCode(socketMessage.getCode());

        String jsonMessage = objectMapper.writeValueAsString(response);
        for (WebSocketSession s : room.getSessions()) {
            if (s == session || !s.isOpen()) continue;
            synchronized (s) {
                try {
                    s.sendMessage(new TextMessage(jsonMessage));
                } catch (IllegalStateException e) {
                    System.out.println("Failed to send YJS_UPDATE to session " + s.getId() + ": " + e.getMessage());
                }
            }
        }
    }

    public void handleCursorMove(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        Room room = roomService.getRoom(socketMessage.getRoomId());
        if (room == null) return;

        SocketMessage response = new SocketMessage();
        response.setType("CURSOR_MOVE");
        response.setRoomId(socketMessage.getRoomId());
        response.setSender(socketMessage.getSender());
        response.setUsername(socketMessage.getUsername());
        response.setLineNumber(socketMessage.getLineNumber());
        response.setColumn(socketMessage.getColumn());

        String jsonMessage = objectMapper.writeValueAsString(response);
        for (WebSocketSession s : room.getSessions()) {
            if (s == session || !s.isOpen()) continue;
            synchronized (s) {
                try {
                    s.sendMessage(new TextMessage(jsonMessage));
                } catch (IllegalStateException e) {
                    System.out.println("Failed to send CURSOR_MOVE to session " + s.getId() + ": " + e.getMessage());
                }
            }
        }
    }
    public void handleLanguageChange(SocketMessage socketMessage, WebSocketSession session) throws IOException {
        Room room = roomService.getRoom(socketMessage.getRoomId());
        if (room == null) return;

        // Lazily create state and persist the language
        if (room.getCodeEditorState() == null) {
            room.setCodeEditorState(new CodeEditorState());
        }
        if (socketMessage.getLanguage() != null) {
            room.getCodeEditorState().setLanguage(socketMessage.getLanguage());
        }

        // Broadcast to all other sessions in the room
        SocketMessage response = new SocketMessage();
        response.setType("LANGUAGE_CHANGE");
        response.setRoomId(socketMessage.getRoomId());
        response.setSender(socketMessage.getSender());
        response.setLanguage(socketMessage.getLanguage());

        String jsonMessage = objectMapper.writeValueAsString(response);
        for (WebSocketSession s : room.getSessions()) {
            if (s == session || !s.isOpen()) continue;
            synchronized (s) {
                try {
                    s.sendMessage(new TextMessage(jsonMessage));
                } catch (IllegalStateException e) {
                    System.out.println("Failed to send LANGUAGE_CHANGE to session " + s.getId() + ": " + e.getMessage());
                }
            }
        }
    }
}
