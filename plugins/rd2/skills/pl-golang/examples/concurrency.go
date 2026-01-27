//go:build ignore

// Concurrency patterns examples

package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Example 1: Simple goroutine with WaitGroup
func simpleGoroutine() {
	var wg sync.WaitGroup

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			fmt.Printf("Goroutine %d\n", i)
		}(i)
	}

	wg.Wait()
	fmt.Println("All goroutines completed")
}

// Example 2: Buffered channel (producer-consumer)
func producerConsumer() {
	ch := make(chan int, 10)

	// Producer
	go func() {
		for i := 0; i < 5; i++ {
			ch <- i
			fmt.Printf("Produced: %d\n", i)
		}
		close(ch)
	}()

	// Consumer
	for val := range ch {
		fmt.Printf("Consumed: %d\n", val)
	}
}

// Example 3: Select with timeout
func selectTimeout() {
	ch1 := make(chan string)
	ch2 := make(chan string)

	go func() {
		time.Sleep(100 * time.Millisecond)
		ch1 <- "one"
	}()

	go func() {
		time.Sleep(200 * time.Millisecond)
		ch2 <- "two"
	}()

	select {
	case msg := <-ch1:
		fmt.Println("Received from ch1:", msg)
	case msg := <-ch2:
		fmt.Println("Received from ch2:", msg)
	case <-time.After(50 * time.Millisecond):
		fmt.Println("Timeout!")
	}
}

// Example 4: Worker pool
func workerPool() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	// Start workers
	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	// Send jobs
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs)

	// Collect results
	for a := 1; a <= 5; a++ {
		<-results
	}
}

func worker(id int, jobs <-chan int, results chan<- int) {
	for j := range jobs {
		fmt.Printf("Worker %d processing job %d\n", id, j)
		results <- j * 2
	}
}

// Example 5: Context for cancellation
func contextCancellation() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func(ctx context.Context) {
		for {
			select {
			case <-ctx.Done():
				fmt.Println("Goroutine cancelled")
				return
			default:
				fmt.Println("Working...")
				time.Sleep(100 * time.Millisecond)
			}
		}
	}(ctx)

	time.Sleep(300 * time.Millisecond)
	cancel()
	time.Sleep(100 * time.Millisecond)
}

// Example 6: Fan-out, Fan-in
func fanOutFanIn() {
	// Generator
	gen := func(nums ...int) <-chan int {
		out := make(chan int)
		go func() {
			for _, n := range nums {
				out <- n
			}
			close(out)
		}()
		return out
	}

	// Square (fan-out)
	square := func(in <-chan int) <-chan int {
		out := make(chan int)
		go func() {
			for n := range in {
				out <- n * n
			}
			close(out)
		}()
		return out
	}

	// Merge (fan-in)
	merge := func(cs ...<-chan int) <-chan int {
		var wg sync.WaitGroup
		out := make(chan int)

		output := func(c <-chan int) {
			for n := range c {
				out <- n
			}
			wg.Done()
		}

		wg.Add(len(cs))
		for _, c := range cs {
			go output(c)
		}

		go func() {
			wg.Wait()
			close(out)
		}()
		return out
	}

	// Pipeline
	in := gen(1, 2, 3)
	c1 := square(in)
	c2 := square(in)

	for n := range merge(c1, c2) {
		fmt.Println(n)
	}
}

// Example 7: Rate limiting
func rateLimiting() {
	// Time-based rate limiting
	throttle := time.Tick(200 * time.Millisecond)

	for i := 0; i < 5; i++ {
		<-throttle
		fmt.Printf("Request %d at %s\n", i, time.Now().Format(time.RFC3339))
	}
}

// Example 8: Semaphore pattern
func semaphore() {
	sem := make(chan struct{}, 2) // Max 2 concurrent

	for i := 0; i < 5; i++ {
		i := i
		sem <- struct{}{}
		go func() {
			defer func() { <-sem }()
			fmt.Printf("Worker %d starting\n", i)
			time.Sleep(500 * time.Millisecond)
			fmt.Printf("Worker %d done\n", i)
		}()
	}

	// Wait for all
	for i := 0; i < cap(sem); i++ {
		sem <- struct{}{}
	}
}

func main() {
	fmt.Println("=== Simple Goroutine ===")
	simpleGoroutine()

	fmt.Println("\n=== Producer-Consumer ===")
	producerConsumer()

	fmt.Println("\n=== Select with Timeout ===")
	selectTimeout()

	fmt.Println("\n=== Worker Pool ===")
	workerPool()

	fmt.Println("\n=== Context Cancellation ===")
	contextCancellation()

	fmt.Println("\n=== Fan-out Fan-in ===")
	fanOutFanIn()

	fmt.Println("\n=== Rate Limiting ===")
	rateLimiting()

	fmt.Println("\n=== Semaphore ===")
	semaphore()
}
