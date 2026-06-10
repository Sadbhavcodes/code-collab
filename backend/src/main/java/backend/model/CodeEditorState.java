package backend.model;

import java.util.ArrayList;
import java.util.List;

@lombok.Getter
@lombok.Setter
public class CodeEditorState {
    private String code;
    private String language = "javascript"; // default language

    /**
     * All individual Yjs updates (base64-encoded) received so far, stored in
     * order. When a late joiner connects the server sends the full list; the
     * client applies each update via Y.applyUpdate and Yjs's CRDT logic
     * deduplicates / merges them correctly — no server-side binary merge needed.
     */
    private List<String> yjsUpdates = new ArrayList<>();

    public CodeEditorState() {}
}
