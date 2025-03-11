# PROJECT MANAGEMENT SIMULATION GAME
## Technical Implementation Guide (Revised)

### TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Data Structure](#data-structure)
3. [Core Game Systems](#core-game-systems)
4. [Card System Implementation](#card-system-implementation)
5. [Space Navigation Framework](#space-navigation-framework)
6. [Player State Model](#player-state-model)
7. [CSV Configuration System](#csv-configuration-system)
8. [Financial Calculation Engine](#financial-calculation-engine)
9. [Time Management System](#time-management-system)
10. [Negotiation System](#negotiation-system)
11. [Dice Roll Implementation](#dice-roll-implementation)
12. [Phase Management](#phase-management)
13. [Special Spaces Technical Details](#special-spaces-technical-details)
14. [Regulatory Pathways Implementation](#regulatory-pathways-implementation)
15. [Construction System Implementation](#construction-system-implementation)
16. [Side Quest Framework](#side-quest-framework)
17. [Scoring System Implementation](#scoring-system-implementation)
18. [UI Components](#ui-components)
19. [Test Mode Implementation](#test-mode-implementation)
20. [Game State Persistence](#game-state-persistence)
21. [Validation Systems](#validation-systems)
22. [Transaction and State History](#transaction-and-state-history)
23. [Developer Mode Features](#developer-mode-features)
24. [Technical Appendix](#technical-appendix)

## SYSTEM OVERVIEW

The Project Management Simulation Game is a data-driven simulation that replicates the challenges of managing construction projects. The system is built around a series of interconnected spaces that players navigate through, with actions determined by both user choice and probabilistic outcomes.

The game's core architecture consists of:
- CSV-driven data models for spaces and dice outcomes
- Object-oriented player state management
- Event-driven action resolution
- Multi-layered validation systems
- Complex state memory for strategic path planning

This technical guide details the implementation requirements for developers rebuilding or extending the game system.

## DATA STRUCTURE

### Main Table Structure
The game operates using two primary data tables that define all space behaviors and outcomes:

The Main Table (CSV: "Spaces Info.csv") defines core space properties:
- **Space Name**: Unique identifier for each space
- **Phase**: Which game phase the space belongs to
- **Visit Type**: Separate rules for First vs. Subsequent visits
- **Event**: Description of what happens in this space
- **Action**: Available player actions
- **Outcome**: Potential results of actions
- **Card Interactions**: Effects on W, B, I, L, E cards
- **Time Requirements**: Days required for actions
- **Fee Structures**: Costs associated with the space
- **Movement Options**: Up to 5 possible next spaces
- **Negotiation**: Whether negotiation is allowed (YES/NO)

### Sub Table Structure
The Dice Roll CSV table (CSV: "DiceRoll Info.csv") defines dice-based outcomes:
- **Space Name**: Links to the Main Table space
- **Die Roll**: Outcomes for each possible roll (1-6)
- **Visit Type**: Different outcomes for First vs. Subsequent visits
- Each cell contains specific outcomes like:
  - Card draws/removals
  - Resource modifications
  - Time impacts
  - Destination spaces
  - Special conditions

This data-driven approach creates unique behaviors for each space and allows for highly varied gameplay experiences based on dice outcomes and visit status.

## CORE GAME SYSTEMS

### Action Counter System

The Action Counter is a core mechanic that tracks required player actions before a turn can end:

#### Action Calculation
- Each space automatically calculates its required actions when displayed
- The action count appears at the top of the space table
- Actions include: card draws, fee payments, dice rolls, and movement decisions

#### Grouped Actions
- Some actions are grouped together and count as a single action:
  - B Card and I Card draws count as one combined action
  - Multiple narrative outcomes from one dice roll count as one action

#### Action Types in Detail
- **Card Actions**: Each card type typically counts as one action:
  - W Card (Work Scope)
  - B/I Card (Bank/Investor - counted together)
  - L Card (Life Event)
  - E Card (Expert Help)
- **Fee Payment**: Counts as one action
- **Space Selection**: When multiple next spaces exist, choosing counts as one action
- **Negotiation**: When available, counts as one action

#### Action Completion
- Actions are completed through player interactions:
  - Rolling dice decreases the counter by one
  - Making a choice decreases the counter by one
  - Other actions are automatically marked complete when processed

#### Enforcement
- Players cannot end their turn until all actions are completed
- Exception: Test Mode bypasses this requirement

### Visit Tracking System
The game maintains detailed visit history for each space:
- **Visit Count**: Number of times a space has been visited
- **Has Left Status**: Tracks if player has actually left the space
- **Negotiation History**: Records all negotiations at the space
- **Visit Timestamps**: When each visit occurred

#### Visit Type Determination
- The system checks if a space has been visited before
- Uses the player's visited spaces history
- Determines whether "First" or "Subsequent" visit rules apply

#### Space Marking
- The system adds spaces to the visited list
- Only marks a space when actually visiting (not on negotiations)
- Central to game progression tracking

### First vs. Subsequent Visit Logic
- First visit status is maintained until a player actually leaves a space
- Negotiation doesn't count as leaving a space
- Subsequent visits often have completely different action sets and outcomes
- Some spaces have significant penalties for subsequent visits

## CARD SYSTEM IMPLEMENTATION

### Card Draw Triggers

1. **Space-Based Draws**:
   - Many spaces have built-in card draw requirements
   - Card properties in spaces (wCard, bCard, etc.) define these

2. **Dice Roll Triggers**:
   - Specific dice rolls can trigger card draws
   - The space's diceRollOutcomes determine when this happens

3. **Conditional Draws**:
   - Some cards are only drawn under specific conditions:
     - "Draw 1 if scope ≤ $4M"
     - "Draw 1 if you roll a 1"

### Card Types and Effects

#### W Cards (Work/Scope)
- Define what needs to be built
- Added or removed based on space outcomes and negotiations
- More W cards = larger scope = higher costs but potentially better project
- Space outcomes can force you to add W cards (scope creep) or remove them (scope reduction)
- Effects the 20% design fee calculation
- **Add**: "Draw" - Increases project scope and expected cost
- **Remove**: Reduces project scope and expected cost
- **Replace**: Substitutes one scope item for another (net neutral)
- Limited to maximum 6 cards per player

#### B Cards (Bank)
- Help secure quick loans with lower amounts
- Critical for securing small to medium loans (up to $2.75M)
- Associated with 1-3% interest rate based on loan size
- Processing time: 1 day per $200K (faster than investor loans)
- Provides immediate funding with shorter waiting periods
- Limited loan amounts
- Limited to maximum 6 cards per player

#### I Cards (Investor)
- Help secure larger loans but take longer
- Required for larger project financing
- Fixed 5% interest rate
- Processing time: 30-70 days (substantially slower than bank loans)
- No upper limit on loan amount
- Limited to maximum 6 cards per player

#### L Cards (Life)
- Represent unexpected events that impact your project
- Can be drawn based on specific die rolls
- Create unexpected challenges or opportunities
- Important mitigation factor for risk management
- Effects can include:
  - Time delays
  - Fee increases
  - Requirement changes
  - Space movement
- Limited to maximum 6 cards per player

#### E Cards (Expert)
- Provide specialized help at critical moments
- Drawn at specific spaces where expert advice is valuable
- Can be exchanged or repurposed through certain spaces
- Help navigate complex regulatory and quality challenges
- Effects can include:
  - Fee reductions
  - Time savings
  - Additional options
  - Problem solving
- Limited to maximum 6 cards per player

### Card Management System
A comprehensive system for handling the five card types:
- **Drawing Mechanism**: Rules for when and how many cards to draw
- **Discard Pile**: Separate discard for each card type
- **Reshuffling**: When deck is empty, discard pile is reshuffled
- **Card Replacement**: Exchange one card for another
- **Card-Space Interactions**: Specific spaces trigger card actions

### Card Interaction Examples
1. **Card Exchange**:
   - Some spaces allow trading cards with other players:
     - "The person to your right takes a card"
     - "The person to your left takes a card"

2. **Card Combinations**:
   - B Cards and I Cards are often grouped together for action counting
   - Card combinations can create strategic advantages

3. **Card Management**:
   - Adding too many W Cards increases design fee pressure
   - Balancing different card types is key to successful play

### Safety Net Mechanic
When a player would lose their last Work/Scope (W) card:
- Player is offered one-time "safety net" to stay in the game
- If declining safety net, player is eliminated
- Safety net can only be used once per player
- If all players have no worktypes and decline the safety net, game ends

## SPACE NAVIGATION FRAMEWORK

### Space Memory System
The game implements a sophisticated memory system centered around the PM-DECISION-CHECK space:

- When players visit spaces that have PM-DECISION-CHECK as a next space option, the game stores that space's information in memory
- This stored space information persists until they visit another non-memory-exception space for the first time
- The stored space's next space options and dice roll outcomes are preserved

#### Space Storage Mechanism
When you visit certain spaces that have PM-DECISION-CHECK as an option, the game stores that space's information in memory.
- This stored space information persists until you visit another non-memory-exception space for the first time.
- The stored space's next space options and dice roll outcomes are preserved.

#### Memory Exception Spaces
Certain spaces are designated as "memory exceptions" and don't clear the stored space when visited:
- LEND-SCOPE-CHECK
- BANK-FUND-REVIEW
- INVESTOR-FUND-REVIEW
- OWNER-DECISION-REVIEW
- CHEAT-BYPASS

This allows strategic diversions to these spaces without losing original options.

#### Accessing Stored Options
- When you land on PM-DECISION-CHECK, you'll see the combined options from:
  - The standard PM-DECISION-CHECK options
  - The options from your previously stored space
- This creates strategic depth as you can temporarily divert to gather resources, then return to your original path.

#### Space Clearing
- The stored space is cleared when you visit a non-memory-exception space for the first time.
- This reset mechanism prevents indefinite accumulation of options.

#### Implementation Details
- The game system needs to maintain this memory.
- The space entry handling must manage when spaces are stored or cleared.
- The next space determination needs to combine current and stored options when appropriate.

### Movement Types
Five distinct movement mechanisms:
- **Standard Movement**: Direct movement to connected spaces
- **Dice Movement**: Randomized destinations based on dice roll
- **Conditional Movement**: Requirements must be met to access certain spaces
- **Choice Movement**: Player selects from multiple options
- **Negotiation Movement**: Special movement after negotiation

### Move Validation System
Each move type has specific validation rules:
- **StandardMove Validator**: Checks direct space connections
- **DiceMove Validator**: Validates dice-based destinations
- **ConditionalMove Validator**: Verifies condition satisfaction
- **ChoiceMove Validator**: Ensures valid player selection
- **NegotiationMove Validator**: Checks negotiation limits and rules

### Movement Conditions
Complex conditions can restrict movement:
- **Resource Conditions**: Require specific resource levels
- **Phase Conditions**: Require current phase match
- **Quest Conditions**: Only available during certain quests
- **Visit Conditions**: Depend on previous visit status
- **Card Conditions**: Require possession of specific cards

### Dice-Based Movement
The Sub Table maps dice rolls to specific outcomes:
- Each space has unique dice outcome mappings
- Outcomes vary between first and subsequent visits
- Dice can determine:
  - Destination spaces
  - Resource effects
  - Card draws/discards
  - Special events

### Space Navigation Mechanics

1. **Space Filtering**:
   - The system removes invalid options:
     - Current space (to prevent self-loops)
     - Empty spaces or "n/a" options
     - Improperly formatted spaces

2. **Next Space Determination**:
   - Complex logic in space determination:
     - Checks for dice roll outcomes
     - Handles "or" options in next space text
     - Combines current and stored space options for PM-DECISION-CHECK

3. **Visit Type Determination**:
   - First vs. Subsequent visit affects space behavior
   - Tracked via visited spaces array
   - Space behavior differences handled by having separate space objects

4. **Movement Execution**:
   - The movement handling must:
     - Mark current space as visited
     - Update player's current space
     - Record the movement in transaction history
     - Update game state (days passed, dice counter, etc.)

### Return Space Mechanics

The return space system is particularly complex:

1. When a player lands on a space with "RETURN TO YOUR SPACE" option
2. The game retrieves the player's previous space data
3. The UI displays options from that previous space
4. When the player selects an option, they move as if from the previous space
5. This creates strategic "loops" in the game path

## PLAYER STATE MODEL

Players have extensive state data including:
- Current and previous spaces
- Resource tracking (days, money, costs)
- Card inventory
- Visit tracking history
- Transaction records
- State flags (dice roll status, negotiation status, etc.)
- Score components

### Player Resources
Players manage multiple resources:
- **Money (Purse)**: Financial resources for project development
- **Time (Days)**: Days elapsed during project development
- **Cards**: W, B, I, L, E cards with various effects
- **Design Cost Percentage**: Critical threshold at 20%
- **Expected Cost**: Total projected cost based on W cards
- **Current Cost**: Actual expenses incurred so far

### Player Flags and Status
- **Current Space**: Where the player currently is
- **Previous Space**: Last space visited
- **Phase**: Current game phase
- **Visit Status**: First vs. Subsequent for current space
- **Action Counter**: Required actions remaining
- **Dice Roll Status**: Whether dice has been rolled this turn
- **Negotiation Status**: Whether negotiation is in progress
- **Safety Net Used**: Whether the one-time safety net has been used

### Player Transactions
- Chronological record of all actions
- Time-stamped for reference
- Categorized by type (movement, dice roll, card draw, etc.)
- Includes outcome details

## CSV CONFIGURATION SYSTEM

The game is driven by two primary CSV files that must be loaded at startup:

### Main Table CSV (Spaces Info.csv)
Contains all space definitions including:
- Space properties (name, phase, visit type)
- Card actions
- Fee requirements
- Time costs
- Movement options
- Negotiation availability

#### Main Table CSV Format
The main table CSV has the following columns:
1. **Space Name**: Unique identifier for the space
2. **Phase**: Game phase the space belongs to
3. **Visit Type**: Either "First" or "Subsequent"
4. **Event**: Descriptive text explaining the space's narrative context
5. **Action**: Text describing required player actions
6. **Outcome**: Text describing potential results
7. **W Card**: Worktype card interactions
8. **B Card**: Bank card interactions
9. **I Card**: Investor card interactions
10. **L Card**: Life card interactions
11. **E Card**: Expert card interactions
12. **Time**: Days required for the space
13. **Fee**: Cost associated with the space
14. **Space 1**: First next space option
15. **Space 2**: Second next space option
16. **Space 3**: Third next space option
17. **Space 4**: Fourth next space option
18. **Space 5**: Fifth next space option
19. **Negotiate**: Whether negotiation is allowed ("YES" or "NO")

### Dice Roll CSV (DiceRoll Info.csv)
Contains all dice outcome definitions:
- Mapped by space name and visit type
- Separate outcome for each possible roll (1-6)
- Outcomes include card effects, movement, fees, and time penalties

#### Dice Roll CSV Format
The dice roll table CSV has the following columns:
1. **Space Name**: Must match a Space Name from the Main Table
2. **Die Roll**: Information about the dice roll
3. **Visit Type**: Either "First" or "Subsequent"
4. **1**: Outcome for dice roll 1
5. **2**: Outcome for dice roll 2
6. **3**: Outcome for dice roll 3
7. **4**: Outcome for dice roll 4
8. **5**: Outcome for dice roll 5
9. **6**: Outcome for dice roll 6

### CSV Parser Requirements
The system requires a CSV parser that can:
- Read data from CSV files
- Convert text to appropriate data types
- Handle special formatting and conditions
- Create appropriate space objects
- Link dice roll outcomes to spaces
- Handle "or" conditions in next space definitions
- Process special formatting for card actions

## FINANCIAL CALCULATION ENGINE

### Resource Calculator
Handles complex resource calculations:
- **Design Percentage**: Strictly enforced 20% maximum
- **Work Type Validation**: Ensures 1-6 work types maintained
- **Time Impact Calculations**:
  - Fixed time penalties
  - Dice-based time formulas
  - Negotiation-adjusted time
- **Cost Calculations**:
  - Percentage-based fees
  - Fixed costs
  - Loan amount calculations
  - Design vs. non-design cost tracking

### Design Fee Calculator
- Architecture fees: 8-12% base (first visit), 0-2% additional (subsequent visits)
- Engineering fees: 2-6% base (first visit), 0-2% additional (subsequent visits)
- Critical threshold: 20% maximum design fee (exceeding leads to elimination)

#### Design Fee Calculation Examples
| Space | Roll | Visit Type | Fee Calculation |
|-------|------|------------|----------------|
| ARCH-FEE-REVIEW | 1-2 | First | 8% of project cost |
| ARCH-FEE-REVIEW | 3-4 | First | 10% of project cost |
| ARCH-FEE-REVIEW | 5-6 | First | 12% of project cost |
| ARCH-FEE-REVIEW | 1-2 | Subsequent | 0% (no additional fee) |
| ARCH-FEE-REVIEW | 3-4 | Subsequent | 1% of project cost |
| ARCH-FEE-REVIEW | 5-6 | Subsequent | 2% of project cost |
| ENG-FEE-REVIEW | 1-2 | First | 2% of project cost |
| ENG-FEE-REVIEW | 3-4 | First | 4% of project cost |
| ENG-FEE-REVIEW | 5-6 | First | 6% of project cost |
| ENG-FEE-REVIEW | 1-2 | Subsequent | 0% (no additional fee) |
| ENG-FEE-REVIEW | 3-4 | Subsequent | 1% of project cost |
| ENG-FEE-REVIEW | 5-6 | Subsequent | 2% of project cost |

### Loan Calculator
- Bank loans:
  - Interest rates: 1% (≤$1.4M), 2% ($1.5M-$2.75M), 3% (>$2.75M)
  - Processing time: 1 day per $200K
  - Maximum loan: $4M
- Investor loans:
  - Fixed 5% interest rate
  - Processing time: 30-70 days based on dice roll
  - No maximum amount

#### Bank Loan Calculation Example
For a $1,000,000 loan:
- Interest rate: 1% (since amount ≤ $1.4M)
- Interest amount: $10,000
- Net amount received: $990,000
- Processing time: 5 days (1,000,000 / 200,000 = 5)

#### Investor Loan Calculation Example
For an $8,000,000 loan with die roll of 3:
- Interest rate: 5% (fixed)
- Interest amount: $400,000
- Net amount received: $7,600,000
- Processing time: 50 days (based on roll 3-4 on first visit)

### Construction Cost Calculator
- Quality levels: HIGH (20%), MEDIUM (19%), LOW (18%)
- Time multipliers: HIGH (0.8×), MEDIUM (1.0×), LOW (1.2×)
- Construction time formula: 0.4 × √(estimatedCost/1000) × dieRoll × numberOfWorktypes × contractorMultiplier

#### Construction Cost Example
For a $1,000,000 project with 3 worktypes, MEDIUM quality contractor, and die roll of 4:
- Contractor fee: 19% of $1,000,000 = $190,000
- Time multiplier: 1.0 (MEDIUM quality)
- Construction days: 0.4 × √(1000000/1000) × 4 × 3 × 1.0 = 152 days

### Regulatory Fee Calculator
- DOB Fee: 1% of project cost (first visit), potential additional fees on subsequent visits
- FDNY Fee: 1% of project cost
- Bypass fees: Varying costs based on skipped phases

#### Regulatory Fee Examples
For a $1,000,000 project:
- DOB Initial Fee: $10,000 (1%)
- DOB Post Approval Amendment Fee: $10,000 (1%)
- FDNY Initial Fee: $10,000 (1%)

### Expected vs Current Cost
- **Expected Cost**: Total projected project expense based on W cards
- **Current Cost**: Actual money spent to date
- Progress tracked by comparing these values
- Influences final score calculation

### Bank and Investor Loan System
Detailed financial mechanisms:
- **Bank Loans**:
  - Fast approval (1 day per $200K)
  - Limited amounts
  - Tiered interest rates:
    - 1% for loans up to $1.4M
    - 2% for loans between $1.5M and $2.75M
    - 3% for loans above $2.75M

- **Investor Loans**:
  - Longer approval times (30-70 days)
  - Larger available amounts
  - Flat 5% interest rate
  - Requires I cards

## TIME MANAGEMENT SYSTEM

Time is tracked in "days passed":
- Each space has a time value shown in the space table
- Days are added when ending turns
- Variable time costs based on dice rolls
- Additional days from negotiation, revisiting spaces, and card effects

### Time Accrual
- Each space has a time value (shown in the space table)
- Days are added to your total when you end your turn
- Some spaces have variable time costs based on dice rolls
- Additional days from:
  - Negotiation (extra turns)
  - Revisiting spaces
  - Specific card effects

### Time Impact
- Directly affects your final score (fewer days = better score)
- Creates a strategic tension between thoroughness and speed
- Makes shortcuts tempting despite risks

### Time-Intensive Phases
- **Design Phase**: High time costs (ARCH/ENG spaces often 50 days)
- **Regulatory Phase**: Variable time costs based on approach
- **Construction Phase**: Time costs based on contractor quality

### Time-Saving Strategies
- CHEAT-BYPASS: High-risk shortcut with lowest time cost (1-4 days on good rolls)
- Professional Certification: Faster than Plan Examination (1 day vs 10 days)
- High-quality contractors: Fewer issues mean less rework time
- Optimal path planning: Avoiding unnecessary spaces

## NEGOTIATION SYSTEM

Negotiation is available on spaces marked "YES" in the Negotiate column:
- Players choose to negotiate instead of accepting current outcomes
- Time penalty is applied (typically 1-5 days)
- Player gets a second chance with a new die roll
- Space is treated as "Subsequent Visit" after negotiation
- Cannot mark a space as "left" when negotiating

### Negotiation Process
1. Player chooses to negotiate instead of accepting the standard outcome
2. Accept a time penalty (typically several days added to your project)
3. Get a second chance at the space's outcome (with a new die roll)

### Strategic Considerations for Negotiation
- Time penalties vary by space (typically 1-5 days)
- Negotiation is more valuable when initial die rolls yield poor outcomes
- Some spaces prohibit negotiation (marked as "NO")
- Negotiation may be worth the time penalty for critical decisions
- Excessive negotiation will impact your final score through time penalties

### Negotiation Implementation
- System flag tracks if negotiation is in progress
- Time penalty is applied when negotiation is chosen
- Dice roll state is reset to allow new roll
- Space is not marked as "left"
- Subsequent visit rules apply after negotiation

### Best Negotiation Opportunities
- OWNER-SCOPE-INITIATION: Potentially better scope cards
- OWNER-FUND-INITIATION: Potentially more funding
- LEND-SCOPE-CHECK: Better loan terms
- ARCH-FEE-REVIEW: Lower architectural fees
- ENG-FEE-REVIEW: Lower engineering fees

## DICE ROLL IMPLEMENTATION

The dice roll system manages:
- Random generation of 1-6 rolls
- Outcome determination based on space and visit type
- Parsing outcome text to determine effects
- Applying effects to player state
- Visual highlighting of roll results

### Roll Mechanism
- Standard rolls generate a random number from 1-6
- Test Mode allows preset values
- Each player can only roll once per turn (tracked by dice roll counter)

### Effect Processing Pipeline
When a dice is rolled, the system processes it through several stages:
1. Roll generation and recording
2. Effect determination based on the space and roll value
3. Effect queuing for processing
4. Effect execution
5. Historical recording

### Multiple Effect Handling
A single roll can trigger multiple effects simultaneously:
- Card draws (W, B, I, L, E cards)
- Movement determination
- Fee calculations
- Time passage adjustments
- Effects are queued and processed in order

### Visual Feedback
- The dice roll result is highlighted in the dice roll table
- This makes outcome determination clear to players

### Dice Effects Include
- Card draws/removals
- Space movement
- Fee adjustments
- Time penalties
- Quality determinations
- Success/failure outcomes

### Dice Roll Tables
The game uses the DiceRoll Info.csv to determine specific outcomes. These tables show precisely what happens for each possible dice roll on each space, creating a highly deterministic but varied gameplay experience.

## PHASE MANAGEMENT

The game progresses through seven distinct phases:
1. SETUP
2. OWNER
3. FUNDING
4. DESIGN
5. REGULATORY
6. CONSTRUCTION
7. COMPLETION

### Phase Requirements
Each phase has specific requirements for entry:
- **OWNER**: Requires 'initialScope'
- **FUNDING**: Requires 'ownerApproval'
- **DESIGN**: Requires 'funding'
- **REGULATORY**: Requires 'designComplete'
- **CONSTRUCTION**: Requires 'permits'
- **COMPLETION**: Requires 'inspectionsPassed'

### Phase Triggers
- **gameStart**: Sets phase to SETUP
- **moneyTaken**: Advances to at least FUNDING
- **architectFeePaid**: Advances to at least DESIGN
- **ownerApproval**: Advances to at least OWNER
- **dobFeePaid**: Advances to at least REGULATORY
- **constructionFeePaid**: Advances to at least CONSTRUCTION
- **gameFinished**: Advances to COMPLETION

### Phase Approvals System
Tracks obtained approvals throughout the game:
- Approvals are permanent once acquired
- Some approvals unlock multiple phase transitions
- Phase-specific spaces often grant approvals
- Development Breadcrumbs indicate requirement for "phase-based progression"

### Phase Transition Validation
Complex validation ensures proper progression:
- **Forward Transitions**: Require all prerequisites
- **Backward Transitions**: Always allowed (can move to earlier phases)
- **Same Phase**: Always allowed (staying in current phase)
- **Missing Requirements**: Lists which approvals are still needed

### Phase-Space Relationship
Spaces are organized by phase:
- Each space belongs to a specific phase
- Phase dictates available actions and outcomes
- Some spaces serve as phase transition points
- The Progress Track visualizes phase progression

### Phase Colors
The game uses color coding to help identify phases:
- Blue border: Setup phase spaces
- Orange border: Owner phase spaces
- Green border: Funding phase spaces
- Yellow border: Design phase spaces
- Red border: Regulatory phase spaces
- Purple border: Construction phase spaces
- Gold border: Completion phase spaces

## SPECIAL SPACES TECHNICAL DETAILS

### PM-DECISION-CHECK Space
This pivotal space serves as a gateway to side quests:
- **Purpose**:
  - Central decision point for project direction
  - Provides access to multiple path options
- **Mechanics**:
  - Acts as hub for stored space options
  - Combines its own options with stored space options
  - Reset point after diversions
- **Strategic Use**:
  - Central to path planning strategy
  - Key to accessing diversions and returns
  - Critical for resource gathering
- Life card drawing based on dice roll and visit type
- Multiple path options available

### CHEAT-BYPASS Space
A high-risk, high-reward shortcut mechanism:
- **Purpose**:
  - Represents taking shortcuts in the process
  - Can save significant time if successful
  - High risk of severe penalties if caught
- **Mechanics**:
  - Six possible outcomes based on dice roll:
    1. Skip to ENG-INITIATION (1 day, $500)
    2. Skip to REG-DOB-FEE-REVIEW (2 days, $1,000)
    3. Skip to REG-FDNY-FEE-REVIEW (3 days, $1,500)
    4. Skip to CON-INITIATION (4 days, $2,000)
    5. Caught penalty (60 days, $10,000)
    6. Severe penalty (365 days, $100,000)
  - Returns one Expert card
- **Strategic Use**:
  - Best used when time is critical
  - Risk increases on subsequent visits
  - Can access later project phases directly when successful
- Time outcomes range from minor (1 day) to severe (365 days)
- Destination outcomes range from helpful (skip to late-game spaces) to punitive (return to early spaces)
- Maintains memory of previous CHEAT attempts
- Different mechanics for first and subsequent visits

### OWNER-DECISION-REVIEW Space
- **Purpose**:
  - Represents getting owner input on project decisions
  - Can modify scope or expert resources
- **Mechanics**:
  - Modifies W Cards based on dice roll
  - Can also modify E Cards based on dice roll
  - Stores space for PM-DECISION-CHECK return
- **Strategic Use**:
  - Can reset problematic project scope
  - Provides access to expert resources
  - Creates strategic diversion option

### REG-FDNY-FEE-REVIEW Space
Complex decision tree based on four criteria:
1. Previous FDNY approval status
2. Scope changes since last visit
3. DOB referral status
4. Fire systems present (sprinklers/standpipe/fire alarm/fire suppression)

### CON-INITIATION Space
Two dice rolls determine:
- Quality roll: HIGH (1-2), MED (3-4), or LOW (5-6)
- Multiplier roll: 1-6 multiplication factor
- Quality and multiplier combine to determine:
  - Contractor cost
  - Construction timeline
  - Risk of issues
- Draw 3 E cards (first visit), 1 E card (subsequent)

### CON-ISSUES Space
- **Purpose**:
  - Represents construction problems and challenges
  - Tests project resilience
- **Mechanics**:
  - Dice roll determines severity of issue:
    - 1-2: Minor or no issues (proceed to inspection)
    - 3: Small issues (regulatory review)
    - 4-5: Medium/major issues (regulatory or design review)
    - 6: Critical issues (return to architecture phase)
- **Strategic Use**:
  - Unavoidable but preparable
  - Expert cards can mitigate
  - Proper funding reduces impact

## REGULATORY PATHWAYS IMPLEMENTATION

### Department of Buildings (DOB) Process

#### DOB Fee Review Implementation
- **Space**: REG-DOB-FEE-REVIEW
- **Implementation**:
  - First Visit: Fixed 1% of project cost
  - Subsequent Visits: Dice roll determines additional fees
  - 10-day processing time fixed
  - Updates player state with dobFeePaid flag

#### Filing Type Selection
The system must implement a choice between two regulatory paths:
- **Plan Examiner**:
  - Slower process (10 days)
  - Lower risk of issues
  - More thorough review
- **Professional Certification**:
  - Faster process (1 day)
  - Higher risk of audit
  - Less thorough initial review

#### DOB Plan Examination Process
- **Space**: REG-DOB-PLAN-EXAM
- **Implementation**:
  - First Visit outcomes (dice roll 1-6):
    1. Pass: Proceed to FDNY checks
    2-3. Missing paperwork: Return to self
    4-6. Major problem or missing approval: Various returns
  - Subsequent Visit outcomes have improved odds
  - 10-day fixed processing time
  - Updates player state if passed

#### Professional Certification Process
- **Space**: REG-DOB-PROF-CERT
- **Implementation**:
  - First Visit dice outcomes:
    1-2. Selected for audit (high risk)
    3-6. Pass without audit (low risk)
  - Always 1-day processing (key advantage)
  - Updates player state with certification flag

#### DOB Audit System
- **Space**: REG-DOB-AUDIT
- **Implementation**:
  - 10-day fixed processing time
  - First Visit outcomes (dice roll 1-6):
    1. Pass: Proceed to FDNY
    2-3. Missing files: Return to audit
    4-5. Critical issue: Return to ARCH-INITIATION
    6. Missing approval: Proceed conditionally
  - Updates audit result flags in player state

### FDNY (Fire Department) Process

#### FDNY Fee Review Implementation
- **Space**: REG-FDNY-FEE-REVIEW
- **Implementation**:
  - Four-criteria decision system (boolean logic):
    1. Previous FDNY approval status
    2. Scope changes since last visit
    3. DOB referral status
    4. Fire systems required
  - If any criteria true, proceed to plan exam
  - Otherwise, auto-approve with 1-day cost
  - Fixed 1% fee on first visit

#### FDNY Plan Examination
- **Space**: REG-FDNY-PLAN-EXAM
- **Implementation**:
  - First Visit: 10-day processing
  - Subsequent Visit: 5-day processing
  - Dice roll outcomes vary by visit type
  - Updates player state with FDNY approval

### Regulatory Path Memory
- System must track which filing path was selected (Plan Exam or Prof Cert)
- Choice is permanent for the game session
- Affects all subsequent regulatory interactions
- Implemented via player state flags

### Final Approval Process
- **Space**: REG-DOB-FINAL-REVIEW
- **Implementation**:
  - Verifies all required approvals
  - Dice roll determines final outcome
  - Variable time penalties (1/10/30 days)
  - Can require returns to earlier phases
  - Updates player state with final approval if passed

## CONSTRUCTION SYSTEM IMPLEMENTATION

### Contractor Selection Implementation
- **Space**: CON-INITIATION
- **Implementation**:
  - Two-dice roll system:
    1. Quality roll: HIGH (1-2), MED (3-4), LOW (5-6)
    2. Multiplier roll: 1-6
  - Quality levels:
    - HIGH: 20% cost, 0.8× time multiplier
    - MEDIUM: 19% cost, 1.0× time multiplier
    - LOW: 18% cost, 1.2× time multiplier
  - Construction time formula: 0.4 × √(estimatedCost/1000) × dieRoll × worktypes.length × contractorMultiplier
  - Sets contractor quality flag in player state
  - Updates player purse with contractor fee
  - Updates days passed based on calculated construction time

### Construction Issues Implementation
- **Space**: CON-ISSUES
- **Severity determined by dice roll**:
  - Roll 1: No issues (proceed to inspection)
  - Roll 2: Minor issues (proceed with minor delay)
  - Roll 3: Small issues (require FDNY re-review)
  - Roll 4: Medium issues (require DOB re-review)
  - Roll 5: Major issues (require engineering changes)
  - Roll 6: Critical issues (require architectural changes)
- Time penalties vary by issue severity
- Modified probabilities for subsequent visits
- Implementation requires linkage to contractor quality:
  - HIGH quality: Better dice roll modifiers
  - LOW quality: Worse dice roll modifiers

### Inspection System Implementation
- **Space**: CON-INSPECT
- **Implementation**:
  - Dice roll determines inspection outcome:
    - Roll 1: Pass (proceed to final review)
    - Roll 2: Minor fixes
    - Roll 3: Moderate rework
    - Roll 4: Construction issues (return to CON-ISSUES)
    - Roll 5: FDNY review needed
    - Roll 6: DOB review needed
  - Time penalties vary from 1 day to 25 days
  - Subsequent visits have more favorable odds
  - Updates player state with inspection passed flag if successful

### Construction Time Calculation Algorithm
The system must implement the complex construction time formula as detailed earlier:
- Calculate using the √(estimatedCost/1000) × dieRoll × worktypesCount × qualityMultiplier formula
- Apply the appropriate multiplier based on contractor quality
- Round to the nearest whole number of days

### Construction Issue Probability Modifier
The system must implement probability modifiers based on contractor quality:
- HIGH quality contractors reduce issue severity
- MEDIUM quality contractors have no modification
- LOW quality contractors increase issue severity

## SIDE QUEST FRAMEWORK

### Quest Types and Mechanics
Three quest types with unique properties:
- **LOAN Quest**:
  - Accessed via LEND-SCOPE-CHECK space
  - Provides funding options
  - Path branches to BANK-FUND-REVIEW or INVESTOR-FUND-REVIEW
  - Requires return to main path via PM-DECISION-CHECK

- **OWNER Quest**:
  - Accessed via OWNER-DECISION-REVIEW space
  - Allows scope modifications
  - Can add/remove work types
  - Requires return to main path

- **CHEAT Quest**:
  - Accessed via CHEAT-BYPASS space
  - High risk/reward shortcuts
  - Can skip phases or incur severe penalties
  - Success depends heavily on dice rolls

### Quest Path Validation
Complex validation ensures proper quest navigation:
- Tracks valid quest paths
- Validates each quest step
- Ensures return to valid destination
- Records quest history and outcomes

### Quest Status Tracking
Comprehensive tracking of quest state:
- **Origin Space**: Where quest began
- **Quest Type**: Which quest is active
- **Path History**: Sequence of spaces visited
- **Return Options**: Valid spaces for returning
- **Attempt Count**: Number of times each quest tried
- **Active State**: Whether a quest is currently active

### Quest Abandonment and Completion
Rules for ending quests:
- New quests automatically abandon active ones
- Completed quests record outcomes (success/failure)
- Abandoned quests have penalties
- Quest history affects future quest options

## SCORING SYSTEM IMPLEMENTATION

The scoring system calculates player performance across multiple dimensions:

### Score Components
- **Progress Score**: (Current Cost / Expected Cost) × 100
  - Measures project completion percentage
  - Maximum of 100 points
- **Efficiency Score**: 100 - (Design Cost / Expected Cost) × 100
  - Measures design cost management
  - Maximum of 100 points
- **Time Score**: 100 - Days Passed
  - Measures time efficiency
  - Maximum of 100 points

### Final Score Calculation
- Average of all three components: (Progress + Efficiency + Time) ÷ 3
- Rounded to nearest whole number
- Maximum possible score of 100

### Leaderboard
- Displays current scores for all players
- Updates after each turn
- Sorts players by score (highest to lowest)
- Shows detailed statistics:
  - Days Passed
  - Bank Balance
  - Expected Cost
  - Current Cost
  - Design Cost Percentage
  - Scope Changes
  - Score

## UI COMPONENTS

The game interface is divided into three main columns:

### Left Column - Space Information
- **Space Story**: Displays the narrative context and events for the current space
- **Current Space Table**: Shows detailed information about the space:
  - Required actions (highlighted in yellow)
  - Next available spaces
  - Card effects
  - Fee requirements
  - Negotiation availability
  - Dice roll outcome tables

### Middle Column - Player Information and Actions
- **Current Status**: Displays player information:
  - Player name and color
  - Current space and visit type
  - Game phase
  - Days passed
  - Financial details
  - Design cost percentage
  - Scope changes
- **Decision Area**: Contains action buttons:
  - Dice roll button
  - Space selection options
- **Confirmation Area**: Contains turn management buttons:
  - End Turn button
  - Negotiate button
  - Test Mode toggle

### Right Column - History
- **Transaction History**: Lists all game actions and events
- Provides chronological record of spaces visited, dice rolled, fees paid, and cards drawn

### Color Coding System
The game uses color coding to help identify important elements:
- Yellow background: Required actions
- Blue border: Setup phase spaces
- Green border: Funding phase spaces
- Yellow border: Design phase spaces
- Orange border: Owner phase spaces
- Red border: Regulatory phase spaces
- Purple border: Construction phase spaces
- Gold border: Completion phase spaces

## TEST MODE IMPLEMENTATION

Test Mode provides developer-level access to game mechanics:

### Test Mode Features
- **Space Selection**: Choose any space to move to directly
- **Dice Control**: Set specific dice roll values
- **Action Requirement Bypass**: Skip required actions
- **First/Subsequent Selection**: Choose visit type for testing

### Test Mode Controls
- Checkbox to activate Test Mode
- End Turn button changes color when Test Mode is active
- Space dropdown appears with all game spaces
- Dice preset input field appears next to Roll Dice button

### Test Mode Implementation Requirements
- Ability to toggle Test Mode state
- Override for dice roll to use preset values
- Bypass for action completion requirements
- Controls for forcing First/Subsequent visit status
- Direct movement to any space capability

## GAME STATE PERSISTENCE

The game maintains comprehensive state that can be saved and restored:

### State Components
- Player positions and properties
- Current player index
- Dice roll history
- Transaction records
- Game phase information

### State Management Features
- **State History**: Tracks previous game states for undo functionality
- **Redo Stack**: Maintains forward history after undo
- **History Size Limit**: Maximum 50 states stored
- **State Validation**: Ensures consistency after undo/redo
- **Export Functionality**: Log export, state export, format options

### State Persistence Requirements
- Deep cloning capability for complete state snapshots
- Validation mechanism for imported states
- JSON serialization for export/import
- History management system with size limits
- Undo/redo capability with state restoration

## VALIDATION SYSTEMS

The game implements multiple validation layers:

### Validation Manager
Coordinates all validation activities:
- **Game Rules**: Core rule enforcement
- **Move Rules**: Movement validation
- **Resource Rules**: Resource constraint checking
- **Action Rules**: Action sequence validation

### Game Rule Validator
Ensures fundamental game rules:
- **Work Types**: 1-6 range enforcement
- **Design Costs**: Maximum 20% of total cost
- **Phase Requirements**: Correct phase progression
- **Game End Conditions**: Victory/loss state checking

### Move Validator
Validates all movement operations:
- **Space Connections**: Ensures valid paths
- **Phase Requirements**: Checks phase restrictions
- **Resource Requirements**: Verifies resource sufficiency
- **Side Quest Rules**: Enforces quest movement constraints

### Resource Validator
Checks resource-related rules:
- **Work Type Count**: Ensures 1-6 limit
- **Design Cost Ratio**: Enforces 20% maximum
- **Card Counts**: Validates card limits
- **Resource Availability**: Checks sufficient resources for actions

### Action Validator
Ensures proper action execution:
- **Action Sequence**: Validates required action order
- **Prerequisites**: Checks if action dependencies are met
- **Resource Availability**: Verifies sufficient resources
- **Action Conflicts**: Prevents incompatible actions

## TRANSACTION AND STATE HISTORY

### Transaction Logger Requirements
- Record all player actions chronologically
- Store detailed data for each transaction type
- Capture player state at transaction time
- Provide export capability in multiple formats
- Support filtering and retrieval

### Transaction Types
- Space movements
- Dice rolls
- Card draws and plays
- Fee payments
- Negotiation attempts
- Other game actions

### Transaction Record Structure
- Unique ID
- Timestamp
- Action type
- Detailed action data
- Player state snapshot
- Outcome information

### Visit Tracker
Detailed space visit history:
- **Visit Count**: Number of times each space visited
- **Left Status**: Whether player has departed
- **Negotiation History**: All negotiations at each space
- **Visit Timestamps**: When each visit occurred
- **Movement Types**: How player reached the space

## DEVELOPER MODE FEATURES

### Advanced Debugging Tools
Comprehensive testing features:
- **Debug Log**: Records all actions with context
- **Breakpoints**: Can pause execution on specific actions
- **State Capture**: Records complete game state
- **Metrics Tracking**: Monitors performance data
- **Error Logging**: Detailed error capture system

### Dev Controls
Special developer functionality:
- **Force Move**: Override movement validation
- **Add Resources**: Modify resources freely
- **Toggle Logging**: Enable/disable transaction logging
- **State Inspector**: View detailed game state
- **Test Mode**: Bypass normal game rules
- **Error Simulation**: Generate specific error conditions

### UI Testing Components
Tools for interface testing:
- **Animation Controls**: Adjust animation speed/disable
- **Notification Testing**: Generate test messages
- **Layout Inspection**: View component boundaries
- **Event Monitoring**: Track user interaction
- **Performance Metrics**: View render times and operation speed

## TECHNICAL APPENDIX

### CSV File Format Requirements

#### Main Table CSV Format (Spaces Info.csv)
The main table CSV has the following columns:
1. **Space Name**: Unique identifier for the space
2. **Phase**: Game phase the space belongs to
3. **Visit Type**: Either "First" or "Subsequent"
4. **Event**: Descriptive text explaining the space's narrative context
5. **Action**: Text describing required player actions
6. **Outcome**: Text describing potential results
7. **W Card**: Worktype card interactions
8. **B Card**: Bank card interactions
9. **I Card**: Investor card interactions
10. **L Card**: Life card interactions
11. **E Card**: Expert card interactions
12. **Time**: Days required for the space
13. **Fee**: Cost associated with the space
14. **Space 1**: First next space option
15. **Space 2**: Second next space option
16. **Space 3**: Third next space option
17. **Space 4**: Fourth next space option
18. **Space 5**: Fifth next space option
19. **Negotiate**: Whether negotiation is allowed ("YES" or "NO")

#### Dice Roll CSV Format (DiceRoll Info.csv)
The dice roll table CSV has the following columns:
1. **Space Name**: Must match a Space Name from the Main Table
2. **Die Roll**: Information about the dice roll
3. **Visit Type**: Either "First" or "Subsequent"
4. **1**: Outcome for dice roll 1
5. **2**: Outcome for dice roll 2
6. **3**: Outcome for dice roll 3
7. **4**: Outcome for dice roll 4
8. **5**: Outcome for dice roll 5
9. **6**: Outcome for dice roll 6

### Worktype Card System
Work cards should have:
- ID and descriptive name
- Cost value for budget calculations
- Category or type classification
- Maximum 6 cards per player

### Game Data Requirements
- Space name formatting must be consistent between Main Table and Dice Roll CSV
- All required columns must be present
- Next space options must reference valid space names
- Dice roll outcomes must contain valid action definitions

### Game Performance Considerations
- Load data efficiently from CSV sources
- Cache frequently accessed dice roll outcome tables
- Optimize transaction history rendering for large logs
- Consider performance impact of state history size
- Implement efficient validation checks
