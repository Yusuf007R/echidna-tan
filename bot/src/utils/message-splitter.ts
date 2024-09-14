type SplitMessageType = 'code' | 'text';

export type SplitMessage = {
  type: SplitMessageType;
  content: string;
  language?: string;
};

type SplitResult = {
  isValid: boolean;
  messages: SplitMessage[];
};

export class MessageSplitter {
  private bufferMessage = '';
  private bufferStreamMessage = '';
  private isInCodeBlock = false;
  private isInLongCodeBlock = false;
  private language = '';
  private fullStreamMessage = '';
  private messages: SplitMessage[] = [];

  constructor(public maxLength: number = 1800) {}

  getMessages() {
    return this.messages;
  }

  getFullStreamMessage() {
    return this.fullStreamMessage;
  }

  splitMessage(message: string): SplitResult {
    const lines = message.split('\n');

    for (let i = 0; i < lines.length; i++) {
      this.addLine(lines[i]);
    }

    if (this.bufferMessage) {
      this.pushMessage(this.isInCodeBlock ? 'code' : 'text', this.bufferMessage);
    }

    if (this.isInCodeBlock) {
      console.log('Bad code block');
      return {
        isValid: false,
        messages: [{ type: 'text', content: message }]
      };
    }

    return { isValid: true, messages: this.messages };
  }

  private pushMessage(type: SplitMessageType, content: string) {
    this.messages.push({
      type,
      content: content,
      language: type === 'code' ? this.language : undefined
    });
  }

  addStreamMessage(message: string, isLastChunk: boolean) {
    this.fullStreamMessage += message;
    const messagesLength = this.messages.length;
    if (!message.includes('\n')) {
      this.bufferStreamMessage += message;
      return;
    }

    const fullBufferMessage = this.bufferStreamMessage + message;
    const lines = fullBufferMessage.split('\n');
    for (const [index, line] of lines.entries()) {
      if (index === lines.length - 1 && !isLastChunk) {
        this.bufferStreamMessage = line;
        continue;
      }
      this.addLine(line);
    }

    if (messagesLength !== this.messages.length) {
      return this.messages.at(-1);
    }
  }

  addLine(line: string) {
    const trimmedLine = line.trim();
    const isCodeBlockDelimiter = trimmedLine.startsWith('```');
    const wouldExceedMaxLength = this.bufferMessage.length + line.length + 1 > this.maxLength;

    if (isCodeBlockDelimiter) {
      if (!this.isInCodeBlock) {
        this.language = trimmedLine.split(' ')[0]?.replace('```', '') ?? '';
      }
      if (this.isInLongCodeBlock && wouldExceedMaxLength) {
        this.pushMessage('code', this.bufferMessage + line);
        this.bufferMessage = '';
        this.isInCodeBlock = false;
        this.isInLongCodeBlock = false;
        this.language = '';
        return;
      }
      this.isInLongCodeBlock = false;
      this.isInCodeBlock = !this.isInCodeBlock;
    }

    if (wouldExceedMaxLength) {
      if (this.isInCodeBlock) {
        if (this.isInLongCodeBlock) {
          this.bufferMessage += line + '\n';
          return;
        }
        const codeBlockStartIndex = this.bufferMessage.lastIndexOf('```');
        this.pushMessage('text', this.bufferMessage.slice(0, codeBlockStartIndex));
        this.isInLongCodeBlock = true;
        this.bufferMessage = this.bufferMessage.slice(codeBlockStartIndex);
      } else {
        this.pushMessage('text', this.bufferMessage);
        this.bufferMessage = '';
      }
    }

    this.bufferMessage += line + '\n';
  }
}
