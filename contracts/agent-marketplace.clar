;; Agent Marketplace -- Job posting, escrow, and settlement in sBTC
;; Bitcoin's first autonomous agent labor market

;; Traits
(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-INVALID-STATUS (err u400))
(define-constant ERR-DEADLINE-PASSED (err u410))
(define-constant ERR-TRANSFER-FAILED (err u500))

;; Job statuses
(define-constant STATUS-OPEN u0)
(define-constant STATUS-ACCEPTED u1)
(define-constant STATUS-COMPLETED u2)
(define-constant STATUS-RELEASED u3)
(define-constant STATUS-CANCELLED u4)
(define-constant STATUS-DISPUTED u5)

;; Data
(define-data-var job-counter uint u0)

(define-map jobs
  uint
  {
    poster: principal,
    assignee: (optional principal),
    title: (string-ascii 128),
    desc-hash: (buff 32),
    reward: uint,
    token-contract: principal,
    status: uint,
    deadline: uint,
    proof-hash: (optional (buff 32)),
    created-at: uint
  }
)

(define-map escrows
  uint
  {
    amount: uint,
    token: principal
  }
)

;; Post a new job -- locks reward in escrow
(define-public (post-job
    (title (string-ascii 128))
    (desc-hash (buff 32))
    (reward uint)
    (token <ft-trait>)
    (deadline uint))
  (let ((job-id (var-get job-counter)))
    (try! (contract-call? token transfer reward tx-sender (as-contract tx-sender) none))
    (map-set jobs job-id {
      poster: tx-sender,
      assignee: none,
      title: title,
      desc-hash: desc-hash,
      reward: reward,
      token-contract: (contract-of token),
      status: STATUS-OPEN,
      deadline: deadline,
      proof-hash: none,
      created-at: stacks-block-height
    })
    (map-set escrows job-id {amount: reward, token: (contract-of token)})
    (var-set job-counter (+ job-id u1))
    (print {event: "job-posted", job-id: job-id, poster: tx-sender, reward: reward})
    (ok job-id)
  )
)

;; Accept a job (must be registered agent)
(define-public (accept-job (job-id uint))
  (let ((job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status job) STATUS-OPEN) ERR-INVALID-STATUS)
    (asserts! (< stacks-block-height (get deadline job)) ERR-DEADLINE-PASSED)
    (asserts! (contract-call? .agent-registry is-registered tx-sender) ERR-UNAUTHORIZED)
    (map-set jobs job-id (merge job {
      assignee: (some tx-sender),
      status: STATUS-ACCEPTED
    }))
    (print {event: "job-accepted", job-id: job-id, assignee: tx-sender})
    (ok true)
  )
)

;; Mark job as completed with proof
(define-public (complete-job (job-id uint) (proof-hash (buff 32)))
  (let ((job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status job) STATUS-ACCEPTED) ERR-INVALID-STATUS)
    (asserts! (is-eq (some tx-sender) (get assignee job)) ERR-UNAUTHORIZED)
    (map-set jobs job-id (merge job {
      status: STATUS-COMPLETED,
      proof-hash: (some proof-hash)
    }))
    (print {event: "job-completed", job-id: job-id, proof-hash: proof-hash})
    (ok true)
  )
)

;; Release payment -- poster confirms completion
(define-public (release-payment (job-id uint) (token <ft-trait>))
  (let (
    (job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND))
    (escrow (unwrap! (map-get? escrows job-id) ERR-NOT-FOUND))
    (assignee (unwrap! (get assignee job) ERR-NOT-FOUND))
  )
    (asserts! (is-eq (get status job) STATUS-COMPLETED) ERR-INVALID-STATUS)
    (asserts! (is-eq tx-sender (get poster job)) ERR-UNAUTHORIZED)
    (try! (as-contract (contract-call? token transfer (get amount escrow) tx-sender assignee none)))
    (map-set jobs job-id (merge job {status: STATUS-RELEASED}))
    (try! (contract-call? .agent-registry update-reputation assignee true))
    (print {event: "payment-released", job-id: job-id, amount: (get amount escrow), to: assignee})
    (ok true)
  )
)

;; Cancel job -- only poster, only if still open
(define-public (cancel-job (job-id uint) (token <ft-trait>))
  (let (
    (job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND))
    (escrow (unwrap! (map-get? escrows job-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq (get status job) STATUS-OPEN) ERR-INVALID-STATUS)
    (asserts! (is-eq tx-sender (get poster job)) ERR-UNAUTHORIZED)
    (try! (as-contract (contract-call? token transfer (get amount escrow) tx-sender (get poster job) none)))
    (map-set jobs job-id (merge job {status: STATUS-CANCELLED}))
    (print {event: "job-cancelled", job-id: job-id})
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-job (job-id uint))
  (map-get? jobs job-id)
)

(define-read-only (get-escrow (job-id uint))
  (map-get? escrows job-id)
)

(define-read-only (get-job-count)
  (var-get job-counter)
)
