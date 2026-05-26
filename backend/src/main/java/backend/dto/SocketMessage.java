package backend.dto;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class SocketMessage {
    private String type;
    private String sender;
    private String content;

    public SocketMessage(){
    }

}
