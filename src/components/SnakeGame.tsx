import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
const INITIAL_DIRECTION: Direction = "RIGHT";
const INITIAL_SPEED = 175;

export const SnakeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>(() => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  }));
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);

  const generateFood = useCallback((snakeBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood({
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    });
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
    setSpeed(INITIAL_SPEED);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && !gameOver) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          setGameStarted(true);
        }
      }

      const currentDirection = directionRef.current;
      
      switch (e.key) {
        case "ArrowUp":
          if (currentDirection !== "DOWN") {
            setDirection("UP");
            directionRef.current = "UP";
          }
          break;
        case "ArrowDown":
          if (currentDirection !== "UP") {
            setDirection("DOWN");
            directionRef.current = "DOWN";
          }
          break;
        case "ArrowLeft":
          if (currentDirection !== "RIGHT") {
            setDirection("LEFT");
            directionRef.current = "LEFT";
          }
          break;
        case "ArrowRight":
          if (currentDirection !== "LEFT") {
            setDirection("RIGHT");
            directionRef.current = "RIGHT";
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };

        switch (directionRef.current) {
          case "UP":
            head.y -= 1;
            break;
          case "DOWN":
            head.y += 1;
            break;
          case "LEFT":
            head.x -= 1;
            break;
          case "RIGHT":
            head.x += 1;
            break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore(prev => {
            const newScore = prev + 1;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('snakeHighScore', newScore.toString());
            }
            return newScore;
          });
          setFood(generateFood(newSnake));
          return newSnake;
        }

        newSnake.pop();
        return newSnake;
      });
    };

    const gameLoop = setInterval(moveSnake, speed);
    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, food, speed, generateFood]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get computed CSS colors
    const styles = getComputedStyle(document.documentElement);
    const bgColor = `hsl(${styles.getPropertyValue('--game-bg').trim()})`;
    const gridColor = `hsl(${styles.getPropertyValue('--grid-line').trim()})`;
    const snakeBodyColor = `hsl(${styles.getPropertyValue('--snake-body').trim()})`;
    const snakeGlowColor = `hsl(${styles.getPropertyValue('--snake-glow').trim()})`;
    const foodColor = `hsl(${styles.getPropertyValue('--food').trim()})`;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake with glow effect
    snake.forEach((segment, index) => {
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = snakeGlowColor;
      
      // Snake body
      ctx.fillStyle = index === 0 ? snakeGlowColor : snakeBodyColor;
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
      
      ctx.shadowBlur = 0;
    });

    // Draw food with pulsing glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = foodColor;
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [snake, food]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 gap-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-2 text-primary-glow" style={{ textShadow: "0 0 20px hsl(var(--snake-glow))" }}>
          SNAKE
        </h1>
        <p className="text-muted-foreground text-lg">Classic retro arcade game</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full max-w-md">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">SCORE</p>
              <p className="text-3xl font-bold text-primary-glow">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">HIGH SCORE</p>
              <p className="text-3xl font-bold text-secondary">{highScore}</p>
            </div>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="border-2 border-primary rounded"
              style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.3)" }}
            />

            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground mb-2">Press any arrow key to start</p>
                  <p className="text-sm text-muted-foreground">Use arrow keys to control the snake</p>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded">
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive mb-2">GAME OVER</p>
                  <p className="text-xl text-foreground mb-4">Score: {score}</p>
                  <Button onClick={resetGame} className="bg-primary hover:bg-primary-glow text-primary-foreground">
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground max-w-md">
            <p className="mb-2">🎮 Controls: Arrow Keys</p>
            <p>Eat the pink food to grow and score points. Don't hit the walls or yourself!</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
