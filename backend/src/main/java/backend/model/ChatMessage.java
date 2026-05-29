package backend.model;

@lombok.Setter
@lombok.Getter
public class ChatMessage {
    private String sender;
    private String content;

    public ChatMessage(){}

    public ChatMessage(String sender, String content){
        this.sender = sender;
        this.content = content;
    }

}
