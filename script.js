document.addEventListener('DOMContentLoaded', () => {
      // DOM Elements
      const body = document.body;
      const themeToggle = document.querySelector('.theme-toggle');
      const board = document.querySelector('.chess-board');
      const gameOverlay = document.querySelector('.game-overlay');
      const gameMessage = document.querySelector('.game-over-message');
      const restartBtn = document.querySelector('.restart-btn');

      // Game state
      let selectedSquare = null;
      let currentPlayer = 'white';
      let enPassantTarget = null;
      let castlingAvailability = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
      };
      let gameOver = false;

      // Piece definitions
      const PIECES = {
            KING: { white: '♔', black: '♚', value: 0 },
            QUEEN: { white: '♕', black: '♛', value: 9 },
            ROOK: { white: '♖', black: '♜', value: 5 },
            BISHOP: { white: '♗', black: '♝', value: 3 },
            KNIGHT: { white: '♘', black: '♞', value: 3 },
            PAWN: { white: '♙', black: '♟', value: 1 }
      };

      // Initialize the board state
      let boardState = Array(8).fill().map(() => Array(8).fill(null));

      // Theme toggle
      themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-theme');
            body.classList.toggle('dark-theme');
            updateBoardVisuals();
      });

      // Restart game
      restartBtn.addEventListener('click', () => {
            initializeGame();
            gameOverlay.classList.remove('visible');
      });

      // Create chess board squares
      function createBoard() {
            board.innerHTML = '';
            for (let row = 0; row < 8; row++) {
                  for (let col = 0; col < 8; col++) {
                        const square = document.createElement('div');
                        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                        square.dataset.row = row;
                        square.dataset.col = col;
                        square.addEventListener('click', () => handleSquareClick(row, col));
                        board.appendChild(square);
                  }
            }
      }

      // Set up initial board position
      function initializeBoard() {
            // Clear board
            boardState = Array(8).fill().map(() => Array(8).fill(null));

            // Set up pawns
            for (let i = 0; i < 8; i++) {
                  boardState[1][i] = { type: 'PAWN', color: 'black', hasMoved: false };
                  boardState[6][i] = { type: 'PAWN', color: 'white', hasMoved: false };
            }

            // Set up other pieces
            const backRow = [
                  'ROOK', 'KNIGHT', 'BISHOP', 'QUEEN',
                  'KING', 'BISHOP', 'KNIGHT', 'ROOK'
            ];

            for (let i = 0; i < 8; i++) {
                  boardState[0][i] = { type: backRow[i], color: 'black', hasMoved: false };
                  boardState[7][i] = { type: backRow[i], color: 'white', hasMoved: false };
            }

            // Reset game state
            currentPlayer = 'white';
            enPassantTarget = null;
            castlingAvailability = {
                  white: { kingside: true, queenside: true },
                  black: { kingside: true, queenside: true }
            };
            gameOver = false;
            selectedSquare = null;

            updateBoardVisuals();
      }

      // Initialize the game
      function initializeGame() {
            createBoard();
            initializeBoard();
      }

      // Update the visual board based on boardState
      function updateBoardVisuals() {
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                  const row = parseInt(square.dataset.row);
                  const col = parseInt(square.dataset.col);
                  const piece = boardState[row][col];

                  // Clear previous classes and content
                  square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                  square.innerHTML = '';

                  if (piece) {
                        square.innerHTML = PIECES[piece.type][piece.color];
                        square.dataset.piece = `${piece.color}-${piece.type}`;
                  }
            });

            // Check for check/checkmate
            checkForCheck();
      }

      // Get piece at a given position
      function getPieceAt(row, col) {
            if (row < 0 || row > 7 || col < 0 || col > 7) return null;
            return boardState[row][col];
      }

      // Highlight possible moves
      function highlightMoves(row, col) {
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                  const r = parseInt(square.dataset.row);
                  const c = parseInt(square.dataset.col);

                  if (isValidMove(row, col, r, c)) {
                        const targetPiece = getPieceAt(r, c);
                        if (targetPiece) {
                              square.classList.add('possible-capture');
                        } else {
                              square.classList.add('possible-move');
                        }
                  }
            });
      }

      // Clear all highlights
      function clearHighlights() {
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                  square.classList.remove('possible-move', 'possible-capture', 'selected');
            });
      }

      // Check if a move is valid
      function isValidMove(fromRow, fromCol, toRow, toCol) {
            const piece = getPieceAt(fromRow, fromCol);
            if (!piece || piece.color !== currentPlayer) return false;

            const targetPiece = getPieceAt(toRow, toCol);
            if (targetPiece && targetPiece.color === currentPlayer) return false;

            // Check piece-specific movement rules
            switch (piece.type) {
                  case 'PAWN':
                        return isValidPawnMove(fromRow, fromCol, toRow, toCol);
                  case 'ROOK':
                        return isValidRookMove(fromRow, fromCol, toRow, toCol);
                  case 'KNIGHT':
                        return isValidKnightMove(fromRow, fromCol, toRow, toCol);
                  case 'BISHOP':
                        return isValidBishopMove(fromRow, fromCol, toRow, toCol);
                  case 'QUEEN':
                        return isValidQueenMove(fromRow, fromCol, toRow, toCol);
                  case 'KING':
                        return isValidKingMove(fromRow, fromCol, toRow, toCol);
                  default:
                        return false;
            }
      }

      // Pawn movement rules
      function isValidPawnMove(fromRow, fromCol, toRow, toCol) {
            const piece = getPieceAt(fromRow, fromCol);
            const direction = piece.color === 'white' ? -1 : 1;
            const startRow = piece.color === 'white' ? 6 : 1;

            // Normal move forward
            if (fromCol === toCol && !getPieceAt(toRow, toCol)) {
                  // Move one square
                  if (toRow === fromRow + direction) return true;
                  // Move two squares from starting position
                  if (fromRow === startRow && toRow === fromRow + 2 * direction &&
                        !getPieceAt(fromRow + direction, fromCol)) {
                        return true;
                  }
            }

            // Capture diagonally
            if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
                  // Normal capture
                  if (getPieceAt(toRow, toCol) && getPieceAt(toRow, toCol).color !== piece.color) {
                        return true;
                  }
                  // En passant
                  if (toRow === (piece.color === 'white' ? 3 : 4) &&
                        enPassantTarget && enPassantTarget.row === toRow &&
                        enPassantTarget.col === toCol) {
                        return true;
                  }
            }

            return false;
      }

      // Rook movement rules
      function isValidRookMove(fromRow, fromCol, toRow, toCol) {
            // Must move in straight line
            if (fromRow !== toRow && fromCol !== toCol) return false;

            // Check path is clear
            if (fromRow === toRow) {
                  const start = Math.min(fromCol, toCol);
                  const end = Math.max(fromCol, toCol);
                  for (let col = start + 1; col < end; col++) {
                        if (getPieceAt(fromRow, col)) return false;
                  }
            } else {
                  const start = Math.min(fromRow, toRow);
                  const end = Math.max(fromRow, toRow);
                  for (let row = start + 1; row < end; row++) {
                        if (getPieceAt(row, fromCol)) return false;
                  }
            }

            return true;
      }

      // Knight movement rules
      function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
            const rowDiff = Math.abs(toRow - fromRow);
            const colDiff = Math.abs(toCol - fromCol);
            return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      }

      // Bishop movement rules
      function isValidBishopMove(fromRow, fromCol, toRow, toCol) {
            // Must move diagonally
            if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;

            // Check path is clear
            const rowStep = toRow > fromRow ? 1 : -1;
            const colStep = toCol > fromCol ? 1 : -1;
            let row = fromRow + rowStep;
            let col = fromCol + colStep;

            while (row !== toRow && col !== toCol) {
                  if (getPieceAt(row, col)) return false;
                  row += rowStep;
                  col += colStep;
            }

            return true;
      }

      // Queen movement rules (combines rook and bishop)
      function isValidQueenMove(fromRow, fromCol, toRow, toCol) {
            return isValidRookMove(fromRow, fromCol, toRow, toCol) ||
                  isValidBishopMove(fromRow, fromCol, toRow, toCol);
      }

      // King movement rules
      function isValidKingMove(fromRow, fromCol, toRow, toCol) {
            const rowDiff = Math.abs(toRow - fromRow);
            const colDiff = Math.abs(toCol - fromCol);

            // Normal king move
            if (rowDiff <= 1 && colDiff <= 1) return true;

            // Castling
            if (rowDiff === 0 && colDiff === 2) {
                  return isValidCastling(fromRow, fromCol, toRow, toCol);
            }

            return false;
      }

      // Castling rules
      function isValidCastling(fromRow, fromCol, toRow, toCol) {
            const piece = getPieceAt(fromRow, fromCol);
            if (piece.type !== 'KING' || piece.hasMoved) return false;

            const isKingside = toCol > fromCol;
            const rookCol = isKingside ? 7 : 0;
            const rook = getPieceAt(fromRow, rookCol);

            if (!rook || rook.type !== 'ROOK' || rook.hasMoved) return false;

            // Check if squares between are empty
            const startCol = Math.min(fromCol, rookCol) + 1;
            const endCol = Math.max(fromCol, rookCol);
            for (let col = startCol; col < endCol; col++) {
                  if (getPieceAt(fromRow, col)) return false;
            }

            // Check if king is in check or would pass through check
            if (isInCheck(piece.color)) return false;

            return true;
      }

      // Check if a color is in check
      function isInCheck(color) {
            // Find the king's position
            let kingPos = null;
            for (let row = 0; row < 8; row++) {
                  for (let col = 0; col < 8; col++) {
                        const piece = getPieceAt(row, col);
                        if (piece && piece.type === 'KING' && piece.color === color) {
                              kingPos = { row, col };
                              break;
                        }
                  }
                  if (kingPos) break;
            }

            if (!kingPos) return false;

            // Check if any opponent's piece can attack the king
            for (let row = 0; row < 8; row++) {
                  for (let col = 0; col < 8; col++) {
                        const piece = getPieceAt(row, col);
                        if (piece && piece.color !== color) {
                              if (isValidMove(row, col, kingPos.row, kingPos.col)) {
                                    return true;
                              }
                        }
                  }
            }

            return false;
      }

      // Check for check and checkmate
      function checkForCheck() {
            const whiteInCheck = isInCheck('white');
            const blackInCheck = isInCheck('black');

            // Highlight king in check
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                  const row = parseInt(square.dataset.row);
                  const col = parseInt(square.dataset.col);
                  const piece = getPieceAt(row, col);

                  if (piece && piece.type === 'KING') {
                        if ((piece.color === 'white' && whiteInCheck) ||
                              (piece.color === 'black' && blackInCheck)) {
                              square.classList.add('check');
                        } else {
                              square.classList.remove('check');
                        }
                  }
            });

            // Check for checkmate
            if (whiteInCheck || blackInCheck) {
                  const colorInCheck = whiteInCheck ? 'white' : 'black';
                  if (isCheckmate(colorInCheck)) {
                        endGame(colorInCheck === 'white' ? 'Black wins by checkmate!' : 'White wins by checkmate!');
                  }
            } else if (isStalemate()) {
                  endGame('Game ended in stalemate!');
            }
      }

      // Check if it's checkmate
      function isCheckmate(color) {
            // Try all possible moves for the color to see if any can get out of check
            for (let fromRow = 0; fromRow < 8; fromRow++) {
                  for (let fromCol = 0; fromCol < 8; fromCol++) {
                        const piece = getPieceAt(fromRow, fromCol);
                        if (piece && piece.color === color) {
                              for (let toRow = 0; toRow < 8; toRow++) {
                                    for (let toCol = 0; toCol < 8; toCol++) {
                                          if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                                                // Make a test move
                                                const originalPiece = getPieceAt(toRow, toCol);
                                                boardState[toRow][toCol] = piece;
                                                boardState[fromRow][fromCol] = null;

                                                // Check if still in check
                                                const stillInCheck = isInCheck(color);

                                                // Undo the move
                                                boardState[fromRow][fromCol] = piece;
                                                boardState[toRow][toCol] = originalPiece;

                                                if (!stillInCheck) {
                                                      return false; // Found a move that gets out of check
                                                }
                                          }
                                    }
                              }
                        }
                  }
            }

            return true; // No moves get out of check - it's checkmate
      }

      // Check for stalemate
      function isStalemate() {
            // Check if current player has any valid moves
            for (let fromRow = 0; fromRow < 8; fromRow++) {
                  for (let fromCol = 0; fromCol < 8; fromCol++) {
                        const piece = getPieceAt(fromRow, fromCol);
                        if (piece && piece.color === currentPlayer) {
                              for (let toRow = 0; toRow < 8; toRow++) {
                                    for (let toCol = 0; toCol < 8; toCol++) {
                                          if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                                                return false; // Found a valid move
                                          }
                                    }
                              }
                        }
                  }
            }
            return true; // No valid moves found - stalemate
      }

      // End the game
      function endGame(message) {
            gameOver = true;
            gameMessage.textContent = message;
            gameOverlay.classList.add('visible');
            board.style.opacity = '1';
      }

      // Move piece on the board
      function movePiece(fromRow, fromCol, toRow, toCol) {
            const piece = boardState[fromRow][fromCol];
            boardState[toRow][toCol] = piece;
            boardState[fromRow][fromCol] = null;
            piece.hasMoved = true;

            // Handle pawn promotion
            if (piece.type === 'PAWN' && (toRow === 0 || toRow === 7)) {
                  boardState[toRow][toCol].type = 'QUEEN'; // Auto-promote to queen for simplicity
            }

            // Handle en passant
            if (piece.type === 'PAWN' && Math.abs(toRow - fromRow) === 2) {
                  enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
            } else {
                  enPassantTarget = null;
            }

            // Handle castling
            if (piece.type === 'KING' && Math.abs(toCol - fromCol) === 2) {
                  const isKingside = toCol > fromCol;
                  const rookFromCol = isKingside ? 7 : 0;
                  const rookToCol = isKingside ? 5 : 3;

                  // Move the rook
                  boardState[toRow][rookToCol] = boardState[toRow][rookFromCol];
                  boardState[toRow][rookFromCol] = null;
                  boardState[toRow][rookToCol].hasMoved = true;
            }

            updateBoardVisuals();
      }

      // Switch player
      function switchPlayer() {
            currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
      }

      // Handle a square click (move piece or select piece)
      function handleSquareClick(row, col) {
            if (gameOver) return;

            const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
            const piece = getPieceAt(row, col);

            if (!selectedSquare) {
                  // Select the piece if it's the current player's turn
                  if (piece && piece.color === currentPlayer) {
                        selectedSquare = { row, col };
                        square.classList.add('selected');
                        highlightMoves(row, col);
                  }
            } else {
                  // Try to move the selected piece
                  if (selectedSquare.row === row && selectedSquare.col === col) {
                        // Clicked on the same piece - deselect it
                        clearHighlights();
                        selectedSquare = null;
                        return;
                  }

                  const validMove = isValidMove(selectedSquare.row, selectedSquare.col, row, col);
                  if (validMove) {
                        movePiece(selectedSquare.row, selectedSquare.col, row, col);
                        switchPlayer();
                  }

                  // Deselect the square
                  clearHighlights();
                  selectedSquare = null;
            }
      }

      // Initialize the game
      initializeGame();
});