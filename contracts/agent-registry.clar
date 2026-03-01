;; Agent Registry -- On-chain identity and reputation for AI agents
;; Extends AIBTC ERC-8004 pattern for the agent marketplace

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-ALREADY-REGISTERED (err u409))
(define-constant INITIAL-REPUTATION u100)

;; Data maps
(define-map agents
  principal
  {
    name: (string-ascii 64),
    metadata-uri: (string-utf8 256),
    reputation: uint,
    registered-at: uint,
    jobs-completed: uint,
    jobs-failed: uint,
    staked: uint
  }
)

(define-data-var agent-count uint u0)

;; Register a new agent
(define-public (register-agent (name (string-ascii 64)) (metadata-uri (string-utf8 256)))
  (begin
    (asserts! (is-none (map-get? agents tx-sender)) ERR-ALREADY-REGISTERED)
    (map-set agents tx-sender {
      name: name,
      metadata-uri: metadata-uri,
      reputation: INITIAL-REPUTATION,
      registered-at: stacks-block-height,
      jobs-completed: u0,
      jobs-failed: u0,
      staked: u0
    })
    (var-set agent-count (+ (var-get agent-count) u1))
    (print {event: "agent-registered", agent: tx-sender, name: name})
    (ok true)
  )
)

;; Stake sBTC for higher-value job eligibility
(define-public (stake-sbtc (amount uint))
  (let ((agent (unwrap! (map-get? agents tx-sender) ERR-NOT-FOUND)))
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer amount tx-sender (as-contract tx-sender) none))
    (map-set agents tx-sender (merge agent {staked: (+ (get staked agent) amount)}))
    (print {event: "agent-staked", agent: tx-sender, amount: amount})
    (ok true)
  )
)

;; Update reputation (called by marketplace contract)
(define-public (update-reputation (agent principal) (completed bool))
  (let ((data (unwrap! (map-get? agents agent) ERR-NOT-FOUND)))
    (asserts! (is-eq contract-caller .agent-marketplace) ERR-UNAUTHORIZED)
    (if completed
      (map-set agents agent (merge data {
        reputation: (+ (get reputation data) u10),
        jobs-completed: (+ (get jobs-completed data) u1)
      }))
      (map-set agents agent (merge data {
        reputation: (if (> (get reputation data) u10) (- (get reputation data) u10) u0),
        jobs-failed: (+ (get jobs-failed data) u1)
      }))
    )
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-agent (agent principal))
  (map-get? agents agent)
)

(define-read-only (get-reputation (agent principal))
  (default-to u0 (get reputation (map-get? agents agent)))
)

(define-read-only (get-agent-count)
  (var-get agent-count)
)

(define-read-only (is-registered (agent principal))
  (is-some (map-get? agents agent))
)
