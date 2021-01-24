class ThunkedBodyParser {
    constructor() {
      this.WAITING_LENGTH = 0;
      this.WAITING_LENGTH_LINE_END = 1;
      this.READING_TRUNK = 2;
      this.WAITING_NEW_LINE = 3;
      this.WAITING_NEW_LINE_END = 4;
      
      this.length = 0;
      this.content = [];
      this.isFinished = false;
      this.current = this.WAITING_LENGTH;
    }
  
    receiveChar(charactor) {
      if (this.current === this.WAITING_LENGTH) {
        console.log('ThunkedBodyParser: ', 'WAITING_LENGTH')
        if (charactor === '\r') {
          if (this.length === 0) {
            this.isFinished = true;
          }
          this.current = this.WAITING_LENGTH_LINE_END;
        } else {
          // the first line in chunk body is a number in hexadecimal
          // this line called length line
          this.length *= 16;
          this.length += parseInt(charactor, 16);
        }
      } else if (this.current === this.WAITING_LENGTH_LINE_END) {
        // check the end of length line
        if (charactor === '\n') {
          this.current = this.READING_TRUNK;
        }
      } else if (this.current === this.READING_TRUNK) {
        // collect each line of chunk in content
        this.content.push(charactor);
        this.length --;
        if (this.length === 0) {
          this.current = this.WAITING_NEW_LINE;
        }
      } else if (this.current === this.WAITING_NEW_LINE) {
        if (charactor === '\r') {
          this.current = this.WAITING_NEW_LINE_END;
        }
      } else if (this.current === this.WAITING_NEW_LINE_END) {
        if (charactor === '\n') {
          this.current = this.WAITING_LENGTH;
        }
      }
    }
  }
  

module.exports = ThunkedBodyParser;