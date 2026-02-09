/************************************************\
 ================================================
 
                      WUKONG
            javascript Xiang Qi engine
           
                        by
                        
                 Code Monkey King
 
 ===============================================
\************************************************/

var Engine = function() {
    // engine version
    const VERSION = '1.0';
    
    // starting position
    const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
    
    // sides to move
    const RED = 0;
    const BLACK = 1;
    const NO_COLOR = 2;
    
    // piece encoding
    const EMPTY = 0;
    const RED_PAWN = 1;
    const RED_ADVISOR = 2;
    const RED_BISHOP = 3;
    const RED_KNIGHT = 4;
    const RED_CANNON = 5;
    const RED_ROOK = 6;
    const RED_KING = 7;
    const BLACK_PAWN = 8;
    const BLACK_ADVISOR = 9;
    const BLACK_BISHOP = 10;
    const BLACK_KNIGHT = 11;
    const BLACK_CANNON = 12;
    const BLACK_ROOK = 13;
    const BLACK_KING = 14;
    const OFFBOARD = 15;
    
    // piece types
    const PAWN = 16;
    const ADVISOR = 17;
    const BISHOP = 18;
    const KNIGHT = 19;
    const CANNON = 20;
    const ROOK = 21;
    const KING = 22;
    
    // map type to piece
    const PIECE_TYPE = [
      0, 
      PAWN, ADVISOR, BISHOP, KNIGHT, CANNON, ROOK, KING,
      PAWN, ADVISOR, BISHOP, KNIGHT, CANNON, ROOK, KING
    ];
    
    // map color to piece
    const PIECE_COLOR = [
      NO_COLOR,
      RED, RED, RED, RED, RED, RED, RED,
      BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK
    ];  
    
    // square encoding
    const A9 = 23, B9 = 24, C9 = 25, D9 = 26, E9 = 27, F9 = 28, G9 = 29, H9 = 30, I9 = 31;
    const A8 = 34, B8 = 35, C8 = 36, D8 = 37, E8 = 38, F8 = 39, G8 = 40, H8 = 41, I8 = 42;
    const A7 = 45, B7 = 46, C7 = 47, D7 = 48, E7 = 49, F7 = 50, G7 = 51, H7 = 52, I7 = 53;
    const A6 = 56, B6 = 57, C6 = 58, D6 = 59, E6 = 60, F6 = 61, G6 = 62, H6 = 63, I6 = 64;
    const A5 = 67, B5 = 68, C5 = 69, D5 = 70, E5 = 71, F5 = 72, G5 = 73, H5 = 74, I5 = 75;
    const A4 = 78, B4 = 79, C4 = 80, D4 = 81, E4 = 82, F4 = 83, G4 = 84, H4 = 85, I4 = 86;
    const A3 = 89, B3 = 90, C3 = 91, D3 = 92, E3 = 93, F3 = 94, G3 = 95, H3 = 96, I3 = 97;
    const A2 = 100, B2 = 101, C2 = 102, D2 = 103, E2 = 104, F2 = 105, G2 = 106, H2 = 107, I2 = 108;
    const A1 = 111, B1 = 112, C1 = 113, D1 = 114, E1 = 115, F1 = 116, G1 = 117, H1 = 118, I1 = 119;
    const A0 = 122, B0 = 123, C0 = 124, D0 = 125, E0 = 126, F0 = 127, G0 = 128, H0 = 129, I0 = 130;
    
    // array to convert board square indices to coordinates
    const COORDINATES = [
      'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 
      'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 
      'xx', 'a9', 'b9', 'c9', 'd9', 'e9', 'f9', 'g9', 'h9', 'i9', 'xx', 
      'xx', 'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'i8', 'xx', 
      'xx', 'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'i7', 'xx', 
      'xx', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', 'i6', 'xx', 
      'xx', 'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'i5', 'xx', 
      'xx', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'i4', 'xx', 
      'xx', 'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'i3', 'xx', 
      'xx', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'i2', 'xx', 
      'xx', 'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'i1', 'xx', 
      'xx', 'a0', 'b0', 'c0', 'd0', 'e0', 'f0', 'g0', 'h0', 'i0', 'xx', 
      'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 
      'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx', 'xx'
    ];
    
    
    /****************************\
     ============================
   
            BOARD VARIABLES

     ============================              
    \****************************/
    
    /*
        PABNCRK      pabncrk
        兵仕相傌炮俥帥  卒士象馬炮車將
        
        Board representation
           (11x14 Mailbox)
        
        x x x x x x x x x x x
        x x x x x x x x x x x
        x r n b a k a b n r x
        x . . . . . . . . . x
        x . c . . . . . c . x
        x p . p . p . p . p x
        x . . . . . . . . . x
        x . . . . . . . . . x
        x P . P . P . P . P x
        x . C . . . . . C . x
        x . . . . . . . . . x
        x R N B A K A B N R x
        x x x x x x x x x x x
        x x x x x x x x x x x
    */
    
    // xiangqi board
    var board = new Array(11 * 14);
    
    // side to move
    var side = RED;
    
    // 60 moves draw rule counter
    var sixty = 0;
    
    // almost unnique position identifier
    var hashKey = 0;
    
    // squares occupied by kings
    var kingSquare = [0, 0];
    
    // move stack
    var moveStack = [];
    
    // plies
    var searchPly = 0;
    var gamePly = 0;

    // GUI/debug values (declared for strict-mode module compatibility)
    var userTime = 0;
    var guiScore = 0;
    var guiDepth = 0;
    var guiTime = 0;
    var guiPv = "";
    var resultString = "";
    
    
    /****************************\
     ============================
   
             BOARD METHODS

     ============================              
    \****************************/
    
    // reset board array and game state variables
    function resetBoard() {
      // reset board position
      for (let rank = 0; rank < 14; rank++) {
        for (let file = 0; file < 11; file++) {
          let square = rank * 11 + file;
          if (COORDINATES[square] != 'xx') board[square] = EMPTY;
          else board[square] = OFFBOARD;
        }
      }
      
      // reset game state variables
      side = RED;
      sixty = 0;
      hashKey = 0;
      kingSquare = [0, 0];
      moveStack = [];
      
      // reset plies
      searchPly = 0;
      gamePly = 0;
      
      // reset repetition table
      for (let index in repetitionTable) repetitionTable[index] = 0;
    }
    
    /****************************\
     ============================
   
      RANDOM NUMBER GENERATOR
   
     ============================              
    \****************************/
      
    // fixed random seed
    var randomState = 1804289383;

    // generate 32-bit pseudo legal numbers
    function random() {
      var number = randomState;
      
      // 32-bit XOR shift
      number ^= number << 13;
      number ^= number >> 17;
      number ^= number << 5;
      randomState = number;

      return number;
    }

    
    /****************************\
     ============================
     
             ZOBRIST KEYS

     ============================              
    \****************************/ 
   
    // random keys
    var pieceKeys = new Array(15 * 154);
    var sideKey;
    
    // init random hash keys
    function initRandomKeys() {
      for (var index = 0; index < pieceKeys.length; index++) pieceKeys[index] = random();
      sideKey = random();
    }
    
    // generate hash key
    function generateHashKey() {
      var finalKey = 0;
      
      // hash board position
      for (var square = 0; square < board.length; square++) {
        if (board[square] != OFFBOARD) {
          let piece = board[square];
          if (piece != EMPTY) finalKey ^= pieceKeys[(piece * board.length) + square];
        }
      }
      
      // hash board state variables
      if (side == RED) finalKey ^= sideKey;
      
      return finalKey;
    }

    
    /****************************\
     ============================
     
            INPUT & OUTPUT
            
     ============================              
    \****************************/
    
    // encode ascii pieces
    const CHAR_TO_PIECE = {
      'P': RED_PAWN,
      'A': RED_ADVISOR,
      'B': RED_BISHOP, 'E': RED_BISHOP,
      'N': RED_KNIGHT, 'H': RED_KNIGHT,
      'C': RED_CANNON,
      'R': RED_ROOK,
      'K': RED_KING,
      'p': BLACK_PAWN,
      'a': BLACK_ADVISOR,
      'b': BLACK_BISHOP, 'e': BLACK_BISHOP,
      'n': BLACK_KNIGHT, 'h': BLACK_KNIGHT,
      'c': BLACK_CANNON,
      'r': BLACK_ROOK,
      'k': BLACK_KING
    };
  
    // ascii character piece representation
    const PIECE_TO_CHAR = ['.', 'P', 'A', 'B', 'N', 'C', 'R', 'K', 'p', 'a', 'b', 'n', 'c', 'r', 'k'];
    
    // set board position from FEN string
    function setBoard(fen) {
      resetBoard();
      var index = 0;
      
      // parse position
      for (let rank = 0; rank < 14; rank++) {
        for (let file = 0; file < 11; file++) {
          let square = rank * 11 + file;
          
          if (board[square] != OFFBOARD) {
            // parse pieces
            if ((fen[index].charCodeAt() >= 'a'.charCodeAt() &&
                 fen[index].charCodeAt() <= 'z'.charCodeAt()) || 
                (fen[index].charCodeAt() >= 'A'.charCodeAt() &&
                 fen[index].charCodeAt() <= 'Z'.charCodeAt())) {
              if (fen[index] == 'K') kingSquare[RED] = square;
              else if (fen[index] == 'k') kingSquare[BLACK] = square;
              board[square] = CHAR_TO_PIECE[fen[index]];
              index++;
            }
            
            // parse empty squares
            if (fen[index].charCodeAt() >= '0'.charCodeAt() &&
                fen[index].charCodeAt() <= '9'.charCodeAt()) {
              var offset = fen[index] - '0';
              if (board[square] == EMPTY) file--;
              file += offset;
              index++;
            }
            if (fen[index] == '/') index++;
          }
        }
      }
      
      // parse side to move
      index++;
      side = (fen[index] == 'b') ? BLACK : RED;
      
      // parse sixty move rule
      sixty = parseInt(fen.split(' ')[fen.split(' ').length - 2]);
      
      // generate hash key
      hashKey = generateHashKey();
    }
    
    // print board to console
    function printBoard() {
      let boardString = '';
      
      // print board position
      for (let rank = 0; rank < 14; rank++) {
        for (let file = 0; file < 11; file++) {
          let square = rank * 11 + file;

          if (board[square] != OFFBOARD) {
            if (file == 1) boardString += 11 - rank + '  ';
            boardString += PIECE_TO_CHAR[board[square]] + ' ';

          }
        }
        
        if (rank < 13) boardString += '\n';
      }
      
      boardString += '   a b c d e f g h i\n\n'
      boardString += '   side:           ' + ((side == RED) ? 'r' : 'b') + '\n';
      boardString += '   sixty:          ' + sixty + '\n';
      boardString += '   hash key:      ' + hashKey + '\n';
      boardString += '   king squares:  [' + COORDINATES[kingSquare[RED]] + ', ' +
                                             COORDINATES[kingSquare[BLACK]] + ']\n'
      console.log(boardString);
    }
    
    // validate move
    function moveFromString(moveString) {
      let moveList = generateMoves(ALL_MOVES);

      // parse move string
      var sourceSquare = (11 - (moveString[1].charCodeAt() - '0'.charCodeAt())) * 11 + (moveString[0].charCodeAt() - 'a'.charCodeAt() + 1);
      var targetSquare = (11 - (moveString[3].charCodeAt() - '0'.charCodeAt())) * 11 + (moveString[2].charCodeAt() - 'a'.charCodeAt() + 1);

      // validate
      for(var count = 0; count < moveList.length; count++) {
        var move = moveList[count].move;
        var promotedPiece = 0;

        if(getSourceSquare(move) == sourceSquare && getTargetSquare(move) == targetSquare) {
          // legal move
          return move;
        }
      }

      // illegal move
      return 0;
    }
    
    // load move sequence
    function loadMoves(moves) {
      moves = moves.split(' ');
      
      for (let index = 0; index < moves.length; index++) {
        let move = moves[index];
        let moveString = moves[index];
        let validMove = moveFromString(move);

        if (validMove) {
          makeMove(validMove);

          if (typeof(document) != 'undefined') {
            try {
              let pv = ''
              let time = 0;
              let score = 0;
              let depth = 0;
              
              if (userTime) {
                time = Date.now() - userTime;
              } else {
                score = guiScore;
                depth = guiDepth;
                time = guiTime;
                pv = guiPv;
              }
              
              moveStack[moveStack.length - 1].score = score;
              moveStack[moveStack.length - 1].depth = depth;
              moveStack[moveStack.length - 1].time = time;
              moveStack[moveStack.length - 1].pv = pv;
            } catch(e) {}
          }
        }
      }
      
      searchPly = 0;
    }
    
    // get game moves
    function getMoves() {
      let moves = [];
      
      for (let index = 0; index < moveStack.length; index++) 
        moves.push(moveToString(moveStack[index].move));
      
      return moves;
    }
    
    // print move
    function moveToString(move) {
      return COORDINATES[getSourceSquare(move)] +
             COORDINATES[getTargetSquare(move)]
    }
    
    // print pseudo legal move list
    function printMoveList(moveList) {
      var listMoves = '   Move    Piece   Captured   Flag   Score\n\n';
      
      for (var index = 0; index < moveList.length; index++) {
        let move = moveList[index].move;
        listMoves += '   ' + COORDINATES[getSourceSquare(move)] + COORDINATES[getTargetSquare(move)];
        listMoves += '    ' + PIECE_TO_CHAR[getSourcePiece(move)] +
                     '       ' + PIECE_TO_CHAR[getTargetPiece(move)] +
                     '          ' + getCaptureFlag(move) +
                     '      ' + moveList[index].score + '\n';
      }
      
      listMoves += '\n   Total moves: ' + moveList.length;
      console.log(listMoves);
    }
    
    
    /****************************\
     ============================
   
               ATTACKS

     ============================              
    \****************************/
    
    // directions
    const UP = -11;
    const DOWN = 11;
    const LEFT = -1;
    const RIGHT = 1;
    
    // piece move offsets
    const ORTHOGONALS = [LEFT, RIGHT, UP, DOWN];
    const DIAGONALS = [UP + LEFT, UP + RIGHT, DOWN + LEFT, DOWN + RIGHT];
    
    // offsets to get attacks by pawns
    const PAWN_ATTACK_OFFSETS = [
      [DOWN, LEFT, RIGHT],
      [UP, LEFT, RIGHT]
    ];
    
    // offsets to get attacks by knights
    const KNIGHT_ATTACK_OFFSETS = [
      [UP + UP + LEFT, LEFT + LEFT + UP],
      [UP + UP + RIGHT, RIGHT + RIGHT + UP],
      [DOWN + DOWN + LEFT, LEFT + LEFT + DOWN],
      [RIGHT + RIGHT + DOWN, DOWN + DOWN + RIGHT]
    ];
    
    // offsets to get attacks by pawns
    const PAWN_MOVE_OFFSETS = [
      [UP, LEFT, RIGHT],
      [DOWN, LEFT, RIGHT]
    ];
    
    // offsets to get target squares for knights
    const KNIGHT_MOVE_OFFSETS = [
      [LEFT + LEFT + UP, LEFT + LEFT + DOWN],
      [RIGHT + RIGHT + UP, RIGHT + RIGHT + DOWN],
      [UP + UP + LEFT, UP + UP + RIGHT],
      [DOWN + DOWN + LEFT, DOWN + DOWN + RIGHT]
    ];
    
    // offsets to get target squares for bishops
    const BISHOP_MOVE_OFFSETS = [(UP + LEFT) * 2, (UP + RIGHT) * 2, (DOWN + LEFT) * 2, (DOWN + RIGHT) * 2];
    
    // square attacked by the given side
    function isSquareAttacked(square, color) {
      // by knights
      for (let direction = 0; direction < DIAGONALS.length; direction++) {
        let directionTarget = square + DIAGONALS[direction];
        
        if (board[directionTarget] == EMPTY) {
          for (let offset = 0; offset < 2; offset++) {
            let knightTarget = square + KNIGHT_ATTACK_OFFSETS[direction][offset];
            if (board[knightTarget] == ((color == RED) ? RED_KNIGHT : BLACK_KNIGHT)) return 1;
          }
        }
      }
      
      // by king, rooks & cannons
      for (let direction = 0; direction < ORTHOGONALS.length; direction++) {
        let directionTarget = square + ORTHOGONALS[direction];
        let jumpOver = 0;
        
        while (board[directionTarget] != OFFBOARD) {
          if (jumpOver == 0) {
            if (board[directionTarget] == ((color == RED) ? RED_ROOK : BLACK_ROOK) ||
              board[directionTarget] == ((color == RED) ? RED_KING : BLACK_KING))
              return 1;
          }

          if (board[directionTarget] != EMPTY) jumpOver++;
          if (jumpOver == 2 && board[directionTarget] == ((color == RED) ? RED_CANNON : BLACK_CANNON))
            return 1;
          
          directionTarget += ORTHOGONALS[direction];
        }
      }
      
      // by pawns
      for (let direction = 0; direction < PAWN_ATTACK_OFFSETS[color].length; direction++) {
        let directionTarget = square + PAWN_ATTACK_OFFSETS[color][direction];
        if (board[directionTarget] == ((color == RED) ? RED_PAWN : BLACK_PAWN)) return 1;
      }
      
      return 0;
    }
    
    
    /****************************\
     ============================
   
            MOVE GENERATOR

     ============================              
    \****************************/
    
    // zones of xiangqi board
    const BOARD_ZONES = [
      [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
        0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
        0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0,
        0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0,
        0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ],
      [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0,
        0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0,
        0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0,
        0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
        0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    ];

    /*
                               MOVE ENCODING
    
        0000 0000 0000 0000 0000 1111 1111  source square  0xFF
        0000 0000 0000 1111 1111 0000 0000  target square  0xFF00
        0000 0000 1111 0000 0000 0000 0000   source piece  0xF0000
        0000 1111 0000 0000 0000 0000 0000   target piece  0xF00000
        0001 0000 0000 0000 0000 0000 0000   capture flag  0x1000000
    */
    
    // store squares & pieces into a single number
    function encodeMove(sourceSquare, targetSquare, sourcePiece, targetPiece, captureFlag) {
      return (sourceSquare) |
             (targetSquare << 8) |
             (sourcePiece << 16) |
             (targetPiece << 20) |
             (captureFlag << 24)
    }
    
    function getSourceSquare(move) { return move & 0xFF }
    function getTargetSquare(move) { return (move >> 8) & 0xFF }
    function getSourcePiece(move) { return (move >> 16) & 0xF }
    function getTargetPiece(move) { return (move >> 20) & 0xF }
    function getCaptureFlag(move) { return (move >> 24) & 0x1 }
    
    // push move into move list
    function pushMove(moveList, sourceSquare, targetSquare, sourcePiece, targetPiece, onlyCaptures) {
      if (targetPiece == EMPTY || PIECE_COLOR[targetPiece] == side ^ 1) {
        let move = 0;
        
        if (targetPiece) move = encodeMove(sourceSquare, targetSquare, sourcePiece, targetPiece, 1);
        else {
          if (onlyCaptures == 0)  
            move = encodeMove(sourceSquare, targetSquare, sourcePiece, targetPiece, 0);
        }

        let moveScore = 0;
        
        if (getCaptureFlag(move)) {
          moveScore = MVV_LVA[board[getSourceSquare(move)] * 15 + board[getTargetSquare(move)]];
          moveScore += 10000;
        } else {
          if (killerMoves[searchPly] == move) moveScore = 9000;
          else if (killerMoves[MAX_PLY + searchPly] == move) moveScore = 8000;
          else moveScore = historyMoves[board[getSourceSquare(move)] * 154 + getTargetSquare(move)];
        }

        if (move) {
          moveList.push({
            move: move,
            score: moveScore
          });
        }
      }
    }
    
    // generate pseudo legal moves
    function generateMoves(onlyCaptures) {
      let moveList = [];
      
      for (let sourceSquare = 0; sourceSquare < board.length; sourceSquare++) {
        if (board[sourceSquare] != OFFBOARD) {
          let piece = board[sourceSquare];
          let pieceType = PIECE_TYPE[piece];
          let pieceColor = PIECE_COLOR[piece];
          
          if (pieceColor == side) {
            // pawns
            if (pieceType == PAWN) {
              for (let direction = 0; direction < PAWN_MOVE_OFFSETS[side].length; direction++) {
                let targetSquare = sourceSquare + PAWN_MOVE_OFFSETS[side][direction];
                let targetPiece = board[targetSquare];
                
                if (targetPiece != OFFBOARD) pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
                if (BOARD_ZONES[side][sourceSquare]) break; 
              }
            }
            
            // kings & advisors
            if (pieceType == KING || pieceType == ADVISOR) {
              for (let direction = 0; direction < ORTHOGONALS.length; direction++) {
                let offsets = (pieceType == KING) ? ORTHOGONALS : DIAGONALS;
                let targetSquare = sourceSquare + offsets[direction];
                let targetPiece = board[targetSquare];
                
                if (BOARD_ZONES[side][targetSquare] == 2) pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
              }
            }
            
            // bishops
            if (pieceType == BISHOP) {
              for (let direction = 0; direction < BISHOP_MOVE_OFFSETS.length; direction++) {
                let targetSquare = sourceSquare + BISHOP_MOVE_OFFSETS[direction];
                let jumpOver = sourceSquare + DIAGONALS[direction];
                let targetPiece = board[targetSquare];
                
                if (BOARD_ZONES[side][targetSquare] && board[jumpOver] == EMPTY) pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
              }
            }
            
            // knights
            if (pieceType == KNIGHT) {
              for (let direction = 0; direction < ORTHOGONALS.length; direction++) {
                let targetDirection = sourceSquare + ORTHOGONALS[direction];
          
                if (board[targetDirection] == EMPTY) {
                  for (let offset = 0; offset < 2; offset++) {
                    let targetSquare = sourceSquare + KNIGHT_MOVE_OFFSETS[direction][offset];
                    let targetPiece = board[targetSquare];
                    
                    if (targetPiece != OFFBOARD) pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
                  }
                }
              }
            }
            
            // rooks & cannons
            if (pieceType == ROOK || pieceType == CANNON) {
              for (let direction = 0; direction < ORTHOGONALS.length; direction++) {
                let targetSquare = sourceSquare + ORTHOGONALS[direction];
                let jumpOver = 0;
                
                while (board[targetSquare] != OFFBOARD) {
                  let targetPiece = board[targetSquare];
                  
                  if (jumpOver == 0) {
                    // all rook moves
                    if (pieceType == ROOK && PIECE_COLOR[targetPiece] == side ^ 1)
                      pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
                    
                    // quiet cannon moves
                    else if (pieceType == CANNON && targetPiece == EMPTY)
                      pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
                  }

                  if (targetPiece) jumpOver++;
                  if (targetPiece && pieceType == CANNON && PIECE_COLOR[targetPiece] == side ^ 1 && jumpOver == 2) {
                    // capture cannon moves
                    pushMove(moveList, sourceSquare, targetSquare, board[sourceSquare], targetPiece, onlyCaptures);
                    break;
                  }

                  targetSquare += ORTHOGONALS[direction];
                }
              }
            }
          }
        }
      }
      
      return moveList;
    }
    
    // generate only legal moves
    function generateLegalMoves() {
      let legalMoves = [];
      let moveList = generateMoves(ALL_MOVES);

      for (let count = 0; count < moveList.length; count++) {
        if (makeMove(moveList[count].move) == 0) continue;
        legalMoves.push(moveList[count]);
        takeBack();
      }
      
      return legalMoves;
    }


    /****************************\
     ============================
   
        MAKE MOVE / TAKE BACK

     ============================              
    \****************************/
    
    // make move
    function makeMove(move) {
      // update plies
      searchPly++;
      gamePly++;
      
      // update repetition table
      repetitionTable[gamePly] = hashKey;
    
      // moveStack board state variables
      moveStack.push({
        move: move,
        hashKey: hashKey,
        sixty: sixty
      });
      
      // parse move
      let sourceSquare = getSourceSquare(move);
      let targetSquare = getTargetSquare(move);
      let sourcePiece = getSourcePiece(move);
      let targetPiece = getTargetPiece(move);
      let captureFlag = getCaptureFlag(move);

      // move piece
      board[targetSquare] = sourcePiece;
      board[sourceSquare] = EMPTY;
      
      // hash piece
      hashKey ^= pieceKeys[sourcePiece * board.length + sourceSquare];
      hashKey ^= pieceKeys[sourcePiece * board.length + targetSquare];
      
      if (captureFlag) {
        sixty = 0;
        hashKey ^= pieceKeys[targetPiece * board.length + targetSquare];
      }
      else sixty++;

      // update king square
      if (board[targetSquare] == RED_KING || board[targetSquare] == BLACK_KING)
        kingSquare[side] = targetSquare;
      
      // switch side to move
      side ^= 1;
      hashKey ^= sideKey;

      // return illegal move if king is left in check 
      if (isSquareAttacked(kingSquare[side ^ 1], side)) {
        takeBack();
        return 0;
      } else return 1;
    }
    
    // take back
    function takeBack() {
      // update plies
      searchPly--;
      gamePly--;
    
      // parse move
      let moveIndex = moveStack.length - 1;
      let move = moveStack[moveIndex].move;    
      let sourceSquare = getSourceSquare(move);
      let targetSquare = getTargetSquare(move);
      let sourcePiece = getSourcePiece(move);
      let targetPiece = getTargetPiece(move);
      
      // move piece
      board[sourceSquare] = sourcePiece;
      board[targetSquare] = EMPTY;
      
      // restore captured piece
      if (getCaptureFlag(move)) {
        board[targetSquare] = targetPiece;
      }
      
      // update king square
      if (board[sourceSquare] == RED_KING || board[sourceSquare] == BLACK_KING)
        kingSquare[side ^ 1] = sourceSquare;

      // switch side to move
      side ^= 1;
           
      sixty = moveStack[moveIndex].sixty;
      hashKey = moveStack[moveIndex].hashKey;
      moveStack.pop();
    }
    
    // make null move
    function makeNullMove() {
      // backup current board state
      moveStack.push({
        move: 0,
        side: side,
        sixty: sixty,
        hashKey: hashKey
      });
      
      sixty = 0;
      side ^= 1;
      hashKey ^= sideKey;
    }
    
    // take null move
    function takeNullMove() {
      // restore board state
      side = moveStack[moveStack.length - 1].side;
      sixty = moveStack[moveStack.length - 1].sixty;
      hashKey = moveStack[moveStack.length - 1].hashKey;
      moveStack.pop();
    }
    
    /****************************\
     ============================
   
                 PERFT

     ============================              
    \****************************/
    
    /*
      rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1
      depth       nodes    checks    captures
          1          44         0           2
          2        1920         6          72
          3       79666       384        3159
          4     3290240     19380      115365
          5   133312995    953251     4917734  
          6  5392831844


      r1ba1a3/4kn3/2n1b4/pNp1p1p1p/4c4/6P2/P1P2R2P/1CcC5/9/2BAKAB2 w - - 0 1
      depth       nodes    checks    captures
          1          38         1           1
          2        1128        12          10
          3       43929      1190        2105
          4     1339047     21299       31409
          5    53112976   1496697     3262495
    */
    
    // perft driver
    function perftDriver(depth) {
      if  (depth == 0) { nodes++; return; }
      
      let moveList = generateMoves(ALL_MOVES);
      
      for (var count = 0; count < moveList.length; count++) {      
        if (!makeMove(moveList[count].move)) continue;
        perftDriver(depth - 1);      
        takeBack();
      }
    }
    
    // perft test
    function perftTest(depth) {
      nodes = 0;
      console.log('   Performance test:\n');
      resultString = '';
      let startTime = Date.now();
      
      let moveList = generateMoves(ALL_MOVES);
      
      for (var count = 0; count < moveList.length; count++) {
        if (makeMove(moveList[count].move) == 0) continue;
        let cumNodes = nodes;
        perftDriver(depth - 1);
        takeBack();
        let oldNodes = nodes - cumNodes;
        console.log(  '   move' +
                      ' ' + (count + 1) + ((count < 9) ? ':  ': ': ') +
                      COORDINATES[getSourceSquare(moveList[count].move)] +
                      COORDINATES[getTargetSquare(moveList[count].move)] +
                      '    nodes: ' + oldNodes);
      }
      
      resultString += '\n   Depth: ' + depth;
      resultString += '\n   Nodes: ' + nodes;
      resultString += '\n    Time: ' + (Date.now() - startTime) + ' ms\n';
      console.log(resultString);
    }


    /****************************\
     ============================
   
              EVALUATION

     ============================              
    \****************************/
    
    /*
        I took evaluation parameters from Mark Dirish's
        javascript xiangqi engine: https://github.com/markdirish/xiangqi
        
        Credits to initial sources (from Mark's sources):
        
        material weights: by Yen et al. 2004, "Computer Chinese Chess" ICGA Journal
             PST weights: by Li, Cuanqi 2008, "Using AdaBoost to Implement Chinese
                                               Chess Evaluation Functions", UCLA thesis
    */
    
    // evaluate types       P  A  B  N  C  R  K 
    const EVALUATE_TYPES = [1, 0, 0, 1, 1, 1, 0];

    // material weights
    const MATERIAL_WEIGHTS = [
      //  P     A     B     N     C     R      K   
      0, 30,  120,  120,  270,  285,  600,  6000,
      
      //  p     a     b     n     c     r      k
        -30, -120, -120, -270, -285, -600, -6000
    ];

    // piece square tables
    const PST = [
      // pawns
      [
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   3,   6,   9,  12,   9,   6,   3,   0,   0,
        0,  18,  36,  56,  80, 120,  80,  56,  36,  18,   0,
        0,  14,  26,  42,  60,  80,  60,  42,  26,  14,   0, 
        0,  10,  20,  30,  34,  40,  34,  30,  20,  10,   0, 
        0,   6,  12,  18,  18,  20,  18,  18,  12,   6,   0, 
        0,   2,   0,   8,   0,   8,   0,   8,   0,   2,   0, 
        0,   0,   0,  -2,   0,   4,   0,  -2,   0,   0,   0, 
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
      ],
      
      
      [],  // skip advisors
      [],  // skip bishops
      
      // knights
      [
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   4,   8,  16,  12,   4,  12,  16,   8,   4,   0,
        0,   4,  10,  28,  16,   8,  16,  28,  10,   4,   0, 
        0,  12,  14,  16,  20,  18,  20,  16,  14,  12,   0, 
        0,   8,  24,  18,  24,  20,  24,  18,  24,   8,   0, 
        0,   6,  16,  14,  18,  16,  18,  14,  16,   6,   0, 
        0,   4,  12,  16,  14,  12,  14,  16,  12,   4,   0, 
        0,   2,   6,   8,   6,  10,   6,   8,   6,   2,   0, 
        0,   4,   2,   8,   8,   4,   8,   8,   2,   4,   0, 
        0,   0,   2,   4,   4,  -2,   4,   4,   2,   0,   0, 
        0,   0,  -4,   0,   0,   0,   0,   0,  -4,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
      ],
      
      // cannon
      [
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   6,   4,   0, -10, -12, -10,   0,   4,   6,   0,
        0,   2,   2,   0,  -4, -14,  -4,   0,   2,   2,   0, 
        0,   2,   2,   0, -10,  -8, -10,   0,   2,   2,   0, 
        0,   0,   0,  -2,   4,  10,   4,  -2,   0,   0,   0, 
        0,   0,   0,   0,   2,   8,   2,   0,   0,   0,   0, 
        0,  -2,   0,   4,   2,   6,   2,   4,   0,  -2,   0, 
        0,   0,   0,   0,   2,   4,   2,   0,   0,   0,   0, 
        0,   4,   0,   8,   6,  10,   6,   8,   0,   4,   0, 
        0,   0,   2,   4,   6,   6,   6,   4,   2,   0,   0, 
        0,   0,   0,   2,   6,   6,   6,   2,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
      ],
      
      // rooks
      [
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,  14,  14,  12,  18,  16,  18,  12,  14,  14,   0,
        0,  16,  20,  18,  24,  26,  24,  18,  20,  16,   0, 
        0,  12,  12,  12,  18,  18,  18,  12,  12,  12,   0, 
        0,  12,  18,  16,  22,  22,  22,  16,  18,  12,   0, 
        0,  12,  14,  12,  18,  18,  18,  12,  14,  12,   0, 
        0,  12,  16,  14,  20,  20,  20,  14,  16,  12,   0, 
        0,   6,  10,   8,  14,  14,  14,   8,  10,   6,   0, 
        0,   4,   8,   6,  14,  12,  14,   6,   8,   4,   0, 
        0,   8,   4,   8,  16,   8,  16,   8,   4,   8,   0, 
        0,  -2,  10,   6,  14,  12,  14,   6,  10,  -2,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
      ],
      
      []  // skip kings
    ];
    
    // mirror square for black
    const MIRROR_SQUARE = [
      0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
      0,  A0,  B0,  C0,  D0,  E0,  F0,  G0,  H0,  I0,   0,
      0,  A1,  B1,  C1,  D1,  E1,  F1,  G1,  H1,  I1,   0,
      0,  A2,  B2,  C2,  D2,  E2,  F2,  G2,  H2,  I2,   0,
      0,  A3,  B3,  C3,  D3,  E3,  F3,  G3,  H3,  I3,   0,
      0,  A4,  B4,  C4,  D4,  E4,  F4,  G4,  H4,  I4,   0,
      0,  A5,  B5,  C5,  D5,  E5,  F5,  G5,  H5,  I5,   0,
      0,  A6,  B6,  C6,  D6,  E6,  F6,  G6,  H6,  I6,   0,
      0,  A7,  B7,  C7,  D7,  E7,  F7,  G7,  H7,  I7,   0,
      0,  A8,  B8,  C8,  D8,  E8,  F8,  G8,  H8,  I8,   0,
      0,  A9,  B9,  C9,  D9,  E9,  F9,  G9,  H9,  I9,   0,
      0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
    ];
    
    // static evaluation
    function evaluate() {
      let score = 0;
      
      for (let square = 0; square < board.length; square++) {
        if (board[square] != OFFBOARD) {
          if (board[square]) {
            let piece = board[square];
            let pstIndex = PIECE_TYPE[piece] - 16;
            let pieceColor = PIECE_COLOR[piece];
            
            // material score
            score += MATERIAL_WEIGHTS[piece];
            
            // positional score
            if (EVALUATE_TYPES[pstIndex]) {
              if (pieceColor == RED) score += PST[pstIndex][square]
              else score -= PST[pstIndex][MIRROR_SQUARE[square]];
            }
          }
        }
      }
      
      return (side == RED) ? score : -score;
    }


    /****************************\
     ============================
   
         TRANSPOSITION TABLE

     ============================              
    \****************************/
    
    // 16Mb default hash table size
    var hashEntries = 838860;    

    // no hash entry found constant
    const NO_HASH = 100000;

    // transposition table hash flags
    const HASH_EXACT = 0;
    const HASH_ALPHA = 1;
    const HASH_BETA = 2;

    // define TT instance
    var hashTable = [];
    
    // set hash size
    function setHashSize(Mb) {
      hashTable = [];
      
      // adjust MB if going beyond the aloowed bounds
      if(Mb < 4) Mb = 4;
      if(Mb > 128) Mb = 128;
      
      hashEntries = parseInt(Mb * 0x100000 / 20);
      initHashTable();
      
      console.log('Set hash table size to', Mb, 'Mb');
      console.log('Hash table initialized with', hashEntries, 'entries');
    }
    
    // clear TT (hash table)
    function initHashTable() {
      // loop over TT elements
      for (var index = 0; index < hashEntries; index++) {
        // reset TT inner fields
        hashTable[index] = {
          hashKey: 0,
          depth: 0,
          flag: 0,
          score: 0,
          bestMove: 0
        }
      }
    }
    
    // read hash entry data
    function readHashEntry(alpha, beta, bestMove, depth) {
      // init hash entry
      var hashEntry = hashTable[(hashKey & 0x7fffffff) % hashEntries];

      // match hash key
      if (hashEntry.hashKey == hashKey) {
        if (hashEntry.depth >= depth) {
          // init score
          var score = hashEntry.score;
          
          // adjust mating scores
          if (score < -MATE_SCORE) score += searchPly;
          if (score > MATE_SCORE) score -= searchPly;
          
          // match hash flag
          if (hashEntry.flag == HASH_EXACT) return score;
          if ((hashEntry.flag == HASH_ALPHA) && (score <= alpha)) return alpha;
          if ((hashEntry.flag == HASH_BETA) && (score >= beta)) return beta;
        }

        // store best move
        bestMove.value = hashEntry.bestMove;
      }
      
      // if hash entry doesn't exist
      return NO_HASH;
    }

    // write hash entry data
    function writeHashEntry(score, bestMove, depth, hashFlag) {
      // init hash entry
      var hashEntry = hashTable[(hashKey & 0x7fffffff) % hashEntries];

      // adjust mating scores
      if (score < -MATE_SCORE) score -= searchPly;
      if (score > MATE_SCORE) score += searchPly;

      // write hash entry data 
      hashEntry.hashKey = hashKey;
      hashEntry.score = score;
      hashEntry.flag = hashFlag;
      hashEntry.depth = depth;
      hashEntry.bestMove = bestMove;
    }


    /****************************\
     ============================
   
                SEARCH

     ============================              
    \****************************/
    
    // visited nodes count
    var nodes = 0;
    
    // most valuable victim least valuable attacker, e.g. Pxr == 606, Rxp = 
    const MVV_LVA = [
	    0,   0,   0,   0,   0,   0,   0,   0,    0,   0,   0,   0,   0,   0,   0,
	    0,   0,   0,   0,   0,   0,   0,   0,  106, 206, 306, 406, 506, 606, 706,
	    0,   0,   0,   0,   0,   0,   0,   0,  105, 205, 305, 405, 505, 605, 705,
	    0,   0,   0,   0,   0,   0,   0,   0,  104, 204, 304, 404, 504, 604, 704,
	    0,   0,   0,   0,   0,   0,   0,   0,  103, 203, 303, 403, 503, 603, 703,
	    0,   0,   0,   0,   0,   0,   0,   0,  102, 202, 302, 402, 502, 602, 702,
	    0,   0,   0,   0,   0,   0,   0,   0,  101, 201, 301, 401, 501, 601, 701,
	    0,   0,   0,   0,   0,   0,   0,   0,  100, 200, 300, 400, 500, 600, 700,
       
      0, 106, 206, 306, 406, 506, 606, 706,    0,   0,   0,   0,   0,   0,   0,
	    0, 105, 205, 305, 405, 505, 605, 705,    0,   0,   0,   0,   0,   0,   0,
	    0, 104, 204, 304, 404, 504, 604, 704,    0,   0,   0,   0,   0,   0,   0,
	    0, 103, 203, 303, 403, 503, 603, 705,    0,   0,   0,   0,   0,   0,   0,
	    0, 102, 202, 302, 402, 502, 602, 704,    0,   0,   0,   0,   0,   0,   0,
	    0, 101, 201, 301, 401, 501, 601, 703,    0,   0,   0,   0,   0,   0,   0,
	    0, 100, 200, 300, 400, 500, 600, 700,    0,   0,   0,   0,   0,   0,   0
    ];
    
    // search  constants
    const MAX_PLY = 64;
    const INFINITY = 50000;
    const MATE_VALUE = 49000;
    const MATE_SCORE = 48000;
    const DO_NULL = 1;
    const NO_NULL = 0;
    const ALL_MOVES = 0;
    const ONLY_CAPTURES = 1;
    
    // search variables
    var followPv;
    
    // PV table
    var pvTable = new Array(MAX_PLY * MAX_PLY);
    var pvLength = new Array(MAX_PLY);
    
    // killer moves
    var killerMoves = new Array(2 * MAX_PLY);

    // history moves
    var historyMoves = new Array(15 * 154);
    
    // repetition table
    var repetitionTable = new Array(1000);

    // time control handling  
    var timing = {
      timeSet: 0,
      stopTime: 0,
      stopped: 0,
      time: -1
    }
    
    // set time control
    function setTimeControl(timeControl) { timing = timeControl; }
    
    // reset time control
    function resetTimeControl() {
      timing = {
        timeSet: 0,
        stopTime: 0,
        stopped: 0,
        time: -1
      }
    }
    
    function clearSearch() {
      // reset nodes counter
      nodes = 0;
      timing.stopped = 0;
      searchPly = 0;
      
      for (let index = 0; index < pvTable.length; index++) pvTable[index] = 0;
      for (let index = 0; index < pvLength.length; index++) pvLength[index] = 0;
      for (let index = 0; index < killerMoves.length; index++) killerMoves[index] = 0;
      for (let index = 0; index < historyMoves.length; index++) historyMoves[index] = 0;
    }
    
    // handle time control
    function checkTime() {
      if(timing.timeSet == 1 && Date.now() > timing.stopTime) timing.stopped = 1;
    }

    // position repetition detection
    function isRepetition() {
      for (let index = 0; index < gamePly; index++)
        if (repetitionTable[index] == hashKey) return 1;

      return 0;
    }
    
    // move ordering
    function sortMoves(currentCount, moveList) {
      for (let nextCount = currentCount + 1; nextCount < moveList.length; nextCount++) {
        if (moveList[currentCount].score < moveList[nextCount].score) {
          let tempMove = moveList[currentCount];

          moveList[currentCount] = moveList[nextCount];
          moveList[nextCount] = tempMove;
        }
      }
    }
    
    // sort PV move
    function sortPvMove(moveList, bestMove) {
      // sort hash table move
      for (let count = 0; count < moveList.length; count++) {
        if (moveList[count].move == bestMove.value) {
          moveList[count].score = 30000;
          return;
        }
      }
      
      // sort PV move
      if (searchPly && followPv) {
        followPv = 0;
        for (let count = 0; count < moveList.length; count++) {
          if (moveList[count].move == pvTable[searchPly]) {
            followPv = 1;
            moveList[count].score = 20000;
            break;
          }
        }
      }
    }
    
    // store PV move
    function storePvMove(move) {
      pvTable[searchPly * 64 + searchPly] = move;
      for (var nextPly = searchPly + 1; nextPly < pvLength[searchPly + 1]; nextPly++)
        pvTable[searchPly * 64 + nextPly] = pvTable[(searchPly + 1) * 64 + nextPly];
      pvLength[searchPly] = pvLength[searchPly + 1]
    }
    
    // quiescence search
    function quiescence(alpha, beta) {
      pvLength[searchPly] = searchPly;
      nodes++;
      
      if((nodes & 2047 ) == 0) {
        checkTime();
        if (timing.stopped == 1) return 0;
      }

      if (searchPly > MAX_PLY - 1) return evaluate();

      let evaluation = evaluate();
      
      if (evaluation >= beta) return beta;
      if (evaluation > alpha) alpha = evaluation;
      
      var moveList = generateMoves(ONLY_CAPTURES);

      // sort PV move
      sortPvMove(moveList, {'value': 0});
      
      // loop over moves
      for (var count = 0; count < moveList.length; count++) { 
        sortMoves(count, moveList)
        let move = moveList[count].move;
        
        if (makeMove(move) == 0) continue;
        var score = -quiescence(-beta, -alpha);
        takeBack();
        
        if (timing.stopped == 1) return 0;
        if (score > alpha) {
          storePvMove(move);
          alpha = score;
          
          if (score >= beta) return beta;
        }
      }

      return alpha;
    }
    
    // negamax search
    function negamax(alpha, beta, depth, nullMove) {
      pvLength[searchPly] = searchPly;
      
      // best move for TT
      var bestMove = { value: 0 };
      var hashFlag = HASH_ALPHA;
      let score = 0;
      let pvNode = beta - alpha > 1;
      let futilityPruning = 0;
      
      // read hash entry
      if (searchPly && 
         (score = readHashEntry(alpha, beta, bestMove, depth)) != NO_HASH &&
          pvNode == 0) return score;

      // check time left
      if ((nodes & 2047) == 0) {
        checkTime();
        if (timing.stopped == 1) return 0;
      }

      if (sixty >= 120) return 0;
      if ((searchPly && isRepetition())) return -MATERIAL_WEIGHTS[RED_CANNON];
      if (depth == 0) { nodes++; return quiescence(alpha, beta); }
      
      // mate distance pruning
      if (alpha < -MATE_VALUE) alpha = -MATE_VALUE;
      if (beta > MATE_VALUE - 1) beta = MATE_VALUE - 1;
      if (alpha >= beta) return alpha;
      
      let legalMoves = 0;
      let inCheck = isSquareAttacked(kingSquare[side], side ^ 1);
      
      // check extension
      if (inCheck) depth++;
      
      if (inCheck == 0 && pvNode == 0) {
        // static evaluation for pruning purposes
        let staticEval = evaluate();
      
        // evalution pruning
        if (depth < 3 && Math.abs(beta - 1) > -MATE_VALUE + 100) {
          let evalMargin = MATERIAL_WEIGHTS[RED_PAWN] * depth;
          if (staticEval - evalMargin >= beta) return staticEval - evalMargin;
        }
        
        if (nullMove) {
          // null move pruning
          if ( searchPly && depth > 2 && staticEval >= beta) {
            makeNullMove();
            score = -negamax(-beta, -beta + 1, depth - 1 - 2, NO_NULL);
            takeNullMove();
            
            if (timing.stopped == 1) return 0;
            if (score >= beta) return beta;
          }
          
          // razoring
          score = staticEval + MATERIAL_WEIGHTS[RED_PAWN];
          let newScore;
          
          if (score < beta) {
            if (depth == 1) {
              newScore = quiescence(alpha, beta);
              return (newScore > score) ? newScore : score;
            }
          }
          
          score += MATERIAL_WEIGHTS[RED_PAWN];

          if (score < beta && depth < 4) {
            newScore = quiescence(alpha, beta);
            if (newScore < beta) return (newScore > score) ? newScore : score;
          }
        }
        
        // futility pruning condition
        let futilityMargin = [
          0, MATERIAL_WEIGHTS[RED_PAWN], MATERIAL_WEIGHTS[RED_KNIGHT], MATERIAL_WEIGHTS[RED_CANNON]
        ];
        
        if (depth < 4 && Math.abs(alpha) < MATE_SCORE && staticEval + futilityMargin[depth] <= alpha)
          futilityPruning = 1;
      }

      let movesSearched = 0;
      let moveList = generateMoves(ALL_MOVES);
      
      // sort PV move
      sortPvMove(moveList, bestMove);
      
      // loop over moves
      for (let count = 0; count < moveList.length; count++) {
        sortMoves(count, moveList);
        let move = moveList[count].move;
        if (makeMove(move) == 0) continue;
        legalMoves++;
        
        // futility pruning
        if (futilityPruning &&
            movesSearched &&
            getCaptureFlag(move) == 0 &&
            isSquareAttacked(kingSquare[side], side ^ 1) == 0
           ) { takeBack(); continue; }
        
        if (movesSearched == 0) score = -negamax(-beta, -alpha, depth - 1, DO_NULL);
        else {
          // LMR
          if(
              pvNode == 0 &&
              movesSearched > 3 &&
              depth > 2 &&
              inCheck == 0 &&
              (getSourceSquare(move) != getSourceSquare(killerMoves[searchPly]) ||
               getTargetSquare(move) != getTargetSquare(killerMoves[searchPly])) &&
              (getSourceSquare(move) != getSourceSquare(killerMoves[MAX_PLY + searchPly]) ||
               getTargetSquare(move) != getTargetSquare(killerMoves[MAX_PLY + searchPly])) &&
              getCaptureFlag(move) == 0
            ) {
              score = -negamax(-alpha - 1, -alpha, depth - 2, DO_NULL);
          } else score = alpha + 1;
            
          // PVS
          if(score > alpha) {
            score = -negamax(-alpha - 1, -alpha, depth - 1, DO_NULL);
            if((score > alpha) && (score < beta)) score = -negamax(-beta, -alpha, depth - 1, DO_NULL);
          }
        }
        
        takeBack();
        movesSearched++;
        
        if (timing.stopped == 1) return 0;
        if (score > alpha) {
          hashFlag = HASH_EXACT;
          bestMove.value = move;
          alpha = score;
          storePvMove(move);
          
          // store history moves
          if (getCaptureFlag(move) == 0)
            historyMoves[board[getSourceSquare(move)] * board.length + getTargetSquare(move)] += depth;
          
          if (score >= beta) {
            // store hash entry with the score equal to beta
            writeHashEntry(beta, bestMove.value, depth, HASH_BETA);

            // store killer moves
            if (getCaptureFlag(move) == 0) {
              killerMoves[MAX_PLY + searchPly] = killerMoves[searchPly];
              killerMoves[searchPly] = move;
            }
            
            return beta;
          }
        }
      }
      
      // checkmate or stalemate is a win
      if (legalMoves == 0) { return -MATE_VALUE + searchPly; }
      
      // store hash entry with the score equal to alpha
      writeHashEntry(alpha, bestMove.value, depth, hashFlag);

      return alpha;
    }
    
    // search position for the best move
    function searchPosition(depth) {
      let start = Date.now();
      let score = 0;
      let lastBestMove = 0;
      
      clearSearch();

      // iterative deepening
      for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
        lastBestMove = pvTable[0];
        followPv = 1;
        score = negamax(-INFINITY, INFINITY, currentDepth, DO_NULL);
        
        // stop searching if time is up
        if (timing.stopped == 1 || 
           ((Date.now() > timing.stopTime) &&
            timing.time != -1)) break;
        
        let info = '';
        
        if (typeof(document) != 'undefined')
          var uciScore = 0;
        
        if (score >= -MATE_VALUE && score <= -MATE_SCORE) {
          info = 'info score mate ' + (parseInt(-(score + MATE_VALUE) / 2 - 1)) + 
                 ' depth ' + currentDepth +
                 ' nodes ' + nodes +
                 ' time ' + (Date.now() - start) +
                 ' pv ';
                 
          if (typeof(document) != 'undefined')
            uciScore = 'M' + Math.abs((parseInt(-(score + MATE_VALUE) / 2 - 1)));
        } else if (score >= MATE_SCORE && score <= MATE_VALUE) {
          info = 'info score mate ' + (parseInt((MATE_VALUE - score) / 2 + 1)) + 
                 ' depth ' + currentDepth +
                 ' nodes ' + nodes +
                 ' time ' + (Date.now() - start) +
                 ' pv ';
               
          if (typeof(document) != 'undefined')
            uciScore = 'M' + Math.abs((parseInt((MATE_VALUE - score) / 2 + 1)));
        } else {
          info = 'info score cp ' + score + 
                 ' depth ' + currentDepth +
                 ' nodes ' + nodes +
                 ' time ' + (Date.now() - start) +
                 ' pv ';
          
          if (typeof(document) != 'undefined')
            uciScore = -score;
        }
        
        for (let count = 0; count < pvLength[0]; count++)
          info += moveToString(pvTable[count]) + ' ';
                  
        console.log(info);
        
        if (typeof(document) != 'undefined') {
          if (uciScore == 49000) uciScore = 'M1';
          guiScore = uciScore;
          guiDepth = info.split('depth ')[1].split(' ')[0];
          guiPv = info.split('pv ')[1];
          guiTime = info.split('time ')[1].split(' ')[0];
        }
        
        if (info.includes('mate') || info.includes('-49000')) break;
      }

      let bestMove = (timing.stopped == 1) ? lastBestMove: pvTable[0];
      console.log('bestmove ' + moveToString(bestMove));
      return bestMove;
    }


    /****************************\
     ============================
   
                 INIT

     ============================              
    \****************************/
    
    // init engine
    (function initAll() {
      initRandomKeys();
      initHashTable();
    }());
    
    
    /****************************\
     ============================
   
                 DEBUG

     ============================              
    \****************************/
    
    // debug engine
    function debug() {
      setBoard(START_FEN);
      //setBoard('r1ba1a3/4kn3/2n1b4/pNp1p1p1p/4c4/6P2/P1P2R2P/1CcC5/9/2BAKAB2 w - - 0 1');
      //setBoard('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1CC51/9/RNBAKABNR w - - 0 1');
      printBoard();
      //perftTest(4);
      searchPosition(8);
    }
    
    return {

      /****************************\
       ============================
     
                PUBLIC API

       ============================              
      \****************************/
      
      // version
      VERSION: VERSION,
      
      // initial position
      START_FEN: START_FEN,
      
      // side to move
      COLOR: {
        RED: RED,
        BLACK: BLACK,
        NO_COLOR: NO_COLOR
      },
      
      // perft
      perft: function(depth) { perftTest(depth); },

      // board methods
      squareToString: function(square) { return COORDINATES[square]; },
      printBoard: function() { printBoard(); },
      setBoard: function(fen) { setBoard(fen); },
      getPiece: function(square) { return board[square]; },
      getSide: function() { return side; },
      getSixty: function() { return sixty; },
      resetSearchPly: function() { searchPly = 0; },
      generateLegalMoves: function() { return generateLegalMoves(); },
      isRepetition: function() { return isRepetition(); },
      inCheck: function(color) { return isSquareAttacked(kingSquare[color], color ^ 1); },
      
      // move manipulation
      moveStack: function () { return moveStack; },
      moveFromString: function(moveString) { return moveFromString(moveString); },
      moveToString: function(move) { return moveToString(move); },
      getSourceSquare: function(move) { return getSourceSquare(move); },
      getTargetSquare: function(move) { return getTargetSquare(move); },
      getCaptureFlag: function(move) { return getCaptureFlag(move); },
      moveStack: function() { return moveStack; },
      loadMoves: function(moves) { loadMoves(moves); },
      getMoves: function() { return getMoves(); },
      printMoveList: function(moveList) { printMoveList(moveList); },
      makeMove: function(move) { makeMove(move)},
      takeBack: function() { takeBack(); },
      
      // timing
      resetTimeControl: function() { resetTimeControl(); },
      setTimeControl: function(timeControl) { setTimeControl(timeControl); },
      getTimeControl: function() { return JSON.parse(JSON.stringify(timing))},
      search: function(depth) { return searchPosition(depth) },
      
      // uci
      setHashSize: function(Mb) { setHashSize(Mb); },
      initHashTable: function() { initHashTable(); },
      
      // debug engine
      debug: function() { debug(); }
      
    }
}

export { Engine };
