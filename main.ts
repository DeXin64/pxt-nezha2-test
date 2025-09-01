
//% color=#ff0011  icon="\uf06d" block="nezhaV2" blockId="nezhaV2"
namespace nezhaV2 {

    export enum MovementDirection {
        //%block="clockwise"
        CW = 1,
        //%block="counterclockwise"
        CCW = 2
    }
    export enum ServoMotionMode {
        //%block="clockwise"
        CW = 2,
        //%block="counterclockwise"
        CCW = 3,
        //%block="shortest path"
        ShortPath = 1
    }

    export enum DelayMode {
        //%block="automatic delay"
        AutoDelayStatus = 1,
        //%block="no delay"
        NoDelay = 0
    }
    export enum SportsMode {
        //%block="degrees"
        Degree = 2,
        //%block="turns"
        Circle = 1,
        //%block="seconds"
        Second = 3
    }


    export enum VerticallDirection {
        //%block="forward"
        Up = 1,
        //%block="backward"
        Down = 2
    }

    export enum Uint {
        //%block="cm"
        cm = 1,
        //%block="inch"
        inch = 2
    }

    export enum DistanceAndAngleUnit {
        //%block="degrees"
        Degree = 2,
        //%block="turns"
        Circle = 1,
        //%block="seconds"
        Second = 3,
        //%block="cm"
        cm = 4,
        //%block="inch"
        inch = 5
    }

    export enum TimeUnit {
        //%block="S"
        s = 1,
        //%block="ms"
        ms = 2,

    }

    export enum MotorPostion {
        //%block="M1"
        M1 = 1,
        //%block="M2"
        M2 = 2,
        //%block="M3"
        M3 = 3,
        //%block="M4"
        M4 = 4
    }
    export enum AccelerationProfile {
        //%block="None"
        None = 0,
        //%block="slow"
        Slow = 1,
        //%block="medium"
        Medium = 2,
        //%block="fast"
        Fast = 3
    }


    let i2cAddr: number = 0x10;
    let servoSpeedGlobal = 900
    // 相对角度值(用于相对角度值归零函数)
    let relativeAngularArr = [0, 0, 0, 0];
    // 组合积木块变量
    let motorLeftGlobal = 0
    let motorRightGlobal = 0
    let degreeToDistance = 0
    // 全局加速曲线配置
    let accelerationProfileGlobal = 0;//  默认不开启加速曲线

    export function delayMs(ms: number): void {
        let time = input.runningTime() + ms
        while (time >= input.runningTime()) {

        }
    }

    export function motorDelay(value: number, motorFunction: SportsMode) {
        let delayTime = 0;
        if (value == 0 || servoSpeedGlobal == 0) {
            return;
        } else if (motorFunction == SportsMode.Circle) {
            delayTime = value * 360000.0 / servoSpeedGlobal + 500;
        } else if (motorFunction == SportsMode.Second) {
            delayTime = (value * 1000);
        } else if (motorFunction == SportsMode.Degree) {
            delayTime = value * 1000.0 / servoSpeedGlobal + 500;
        }
        basic.pause(delayTime);

    }



    //% group="Basic functions"
    //% block="set %motor at %speed\\%to run %direction %value %mode || %isDelay"
    //% inlineInputMode=inline
    //% speed.min=0  speed.max=100
    //% weight=407 
    export function move(motor: MotorPostion, speed: number, direction: MovementDirection, value: number, mode: SportsMode, isDelay: DelayMode = DelayMode.AutoDelayStatus): void {
        if (speed <= 0 || value <= 0) {
            // 速度和运行值不能小于等于0
            return;
        }
        setServoSpeed(speed);
        __move(motor, direction, value, mode);
        if (isDelay) {
            motorDelay(value, mode);
        }
    }

    export function __move(motor: MotorPostion, direction: MovementDirection, value: number, mode: SportsMode): void {

        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = direction;
        buf[4] = 0x70;
        buf[5] = (value >> 8) & 0XFF;
        buf[6] = mode;
        buf[7] = (value >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);

    }

    //% group="Basic functions"
    //% weight=406
    //% block="set %motor to rotate %turnMode at angle %angle || %isDelay  "
    //% angle.min=0  angle.max=359
    //% inlineInputMode=inline
    export function moveToAbsAngle(motor: MotorPostion, turnMode: ServoMotionMode, angle: number, isDelay: DelayMode = DelayMode.AutoDelayStatus): void {
        while (angle < 0) {
            angle += 360
        }
        angle %= 360
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x5D;
        buf[5] = (angle >> 8) & 0XFF;
        buf[6] = turnMode;
        buf[7] = (angle >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);
        delayMs(4);// 等待不能删除，且禁止有其他任务插入，否则有BUG
        if (isDelay) {
            motorDelay(0.5, SportsMode.Second)
        }
    }

    //% group="Basic functions"
    //% weight=404
    //% block="set %motor shutting down the motor"
    export function stop(motor: MotorPostion): void {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x5F;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }

    export function __start(motor: MotorPostion, direction: MovementDirection, speed: number): void {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = direction;
        buf[4] = 0x60;
        buf[5] = Math.floor(speed);
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }

    //% group="Basic functions"
    //% weight=403
    //% block="set the speed of %motor to %speed \\% and start the motor"
    //% speed.min=-100  speed.max=100
    export function start(motor: MotorPostion, speed: number): void {
        if (speed < -100) {
            speed = -100
        } else if (speed > 100) {
            speed = 100
        }
        let direction = speed > 0 ? MovementDirection.CW : MovementDirection.CCW
        __start(motor, direction, Math.abs(speed))
    }

    export function readAngle(motor: MotorPostion): number {
        delayMs(4)
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x46;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        delayMs(4)
        let arr = pins.i2cReadBuffer(i2cAddr, 4);
        return (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0]);
    }

    //% group="Basic functions"
    //% weight=402
    //%block="%motor absolute angular value"
    export function readAbsAngle(motor: MotorPostion): number {
        let position = readAngle(motor)
        while (position < 0) {
            position += 3600;
        }
        return (position % 3600) * 0.1;
    }

    //% group="Basic functions"
    //% weight=402
    //%block="%motor relative angular value"
    export function readRelAngle(motor: MotorPostion): number {
        return (readAngle(motor) - relativeAngularArr[motor - 1]) * 0.1;
    }

    //% group="Basic functions"
    //% weight=400
    //%block="%motor speed (laps/sec)"
    export function readSpeed(motor: MotorPostion): number {
        delayMs(4)
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x47;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        delayMs(4)
        let arr = pins.i2cReadBuffer(i2cAddr, 2);
        let retData = (arr[1] << 8) | (arr[0]);
        return Math.floor(retData / 3.6) * 0.01;
    }

    //% group="Basic functions"
    //% weight=399
    //%block="set servo %motor to zero"
    export function reset(motor: MotorPostion): void {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x1D;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        relativeAngularArr[motor - 1] = 0;
        motorDelay(1, SportsMode.Second)
    }

    //% group="Basic functions"
    //% weight=399
    //%block="set servo %motor relative angular to zero"
    export function resetRelAngleValue(motor: MotorPostion) {
        relativeAngularArr[motor - 1] = readAngle(motor);
    }

    export function setServoSpeed(speed: number): void {
        if (speed < 0) speed = 0;
        speed *= 9;
        servoSpeedGlobal = speed;
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = 0x00;
        buf[3] = 0x00;
        buf[4] = 0x77;
        buf[5] = (speed >> 8) & 0XFF;
        buf[6] = 0x00;
        buf[7] = (speed >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);

    }
    //% group="Application functions"
    //% weight=410
    //%block="set the running motor %accelerationProfile profile"
    export function setAccelerationProfile(accelerationProfile: AccelerationProfile): void {
        accelerationProfileGlobal = accelerationProfile;
    }

    //% group="Application functions"
    //% weight=410
    //%block="set the running motor to left wheel %motor_l right wheel %motor_r"
    export function setComboMotor(motor_l: MotorPostion, motor_r: MotorPostion): void {
        motorLeftGlobal = motor_l;
        motorRightGlobal = motor_r;
    }


    // 通用的加速度函数（可被其他函数调用）
    function accelerateMotors(
        motorLeft: MotorPostion,  // 左电机位置
        motorRight: MotorPostion, // 右电机位置
        targetSpeedLeft: number,  // 左电机目标速度
        targetSpeedRight: number, // 右电机目标速度
        direction: VerticallDirection, // 移动方向
        accelerationProfile: AccelerationProfile // 加速度曲线
    ): void {
        // 处理 None 选项（不加速）
        if (accelerationProfile === AccelerationProfile.None) {
            // 直接设置目标速度
            __start(motorLeft, direction % 2 + 1, targetSpeedLeft);
            __start(motorRight, (direction + 1) % 2 + 1, targetSpeedRight);
            return;
        }

        // 设置阶乘因子
        let factor = 4;

        // 加速度曲线配置
        const profiles = [
            { rate: 4 * factor, max: 100 },  // 慢速
            { rate: 6 * factor, max: 100 },  // 中速
            { rate: 8 * factor, max: 100 }   // 快速
        ];

        // 选择加速度曲线（减1是因为None=0，其他值需要减1才能匹配数组索引）
        const profileIndex = accelerationProfile - 1;
        const profile = profiles[profileIndex] || profiles[1]; // 默认使用中速

        const accelRate = profile.rate;
        const maxSpeedLeft = Math.min(targetSpeedLeft, profile.max);
        const maxSpeedRight = Math.min(targetSpeedRight, profile.max);

        // 开始加速过程
        let currentSpeedLeft = 0;
        let currentSpeedRight = 0;
        const startTime = input.runningTime();

        // 加速到最大允许速度
        while (currentSpeedLeft < maxSpeedLeft || currentSpeedRight < maxSpeedRight) {
            // 计算经过的时间(秒)
            const elapsed = (input.runningTime() - startTime) / 1000;

            // 计算目标速度(速度 = 加速度 × 时间)
            let calcTargetSpeedLeft = accelRate * elapsed;
            let calcTargetSpeedRight = accelRate * elapsed;

            // 限制最大速度
            if (calcTargetSpeedLeft > maxSpeedLeft) calcTargetSpeedLeft = maxSpeedLeft;
            if (calcTargetSpeedRight > maxSpeedRight) calcTargetSpeedRight = maxSpeedRight;

            // 应用速度平滑
            if (currentSpeedLeft < maxSpeedLeft) {
                currentSpeedLeft = 0.8 * calcTargetSpeedLeft + 0.2 * currentSpeedLeft;
            }

            if (currentSpeedRight < maxSpeedRight) {
                currentSpeedRight = 0.8 * calcTargetSpeedRight + 0.2 * currentSpeedRight;
            }

            // 设置电机速度
            __start(motorLeft, direction % 2 + 1, currentSpeedLeft);
            __start(motorRight, (direction + 1) % 2 + 1, currentSpeedRight);

            // 短暂暂停避免过度占用CPU
            basic.pause(5);
        }

        // 最终设置用户要求的速度（可能超过加速度曲线的最大值）
        if (targetSpeedLeft > maxSpeedLeft) {
            __start(motorLeft, direction % 2 + 1, targetSpeedLeft);
        }
        if (targetSpeedRight > maxSpeedRight) {
            __start(motorRight, (direction + 1) % 2 + 1, targetSpeedRight);
        }
    }

    //% group="Application functions"
    //% weight=409
    //%block="Set %speed\\% speed and move %direction"
    //% speed.min=0  speed.max=100
    export function comboRun(
        speed: number,
        direction: VerticallDirection,
    ): void {
        if (speed < 0) speed = 0;
        if (speed > 100) speed = 100;

        // 调用通用加速度函数
        accelerateMotors(
            motorLeftGlobal, // 左电机位置
            motorRightGlobal, // 右电机位置
            speed, // 左电机目标速度
            speed, // 右电机目标速度
            direction, // 移动方向
            accelerationProfileGlobal //全局 加速度曲线

        );
    }


    //% group="Application functions"
    //% weight=406
    //%block="stop movement"
    export function comboStop(): void {
        stop(motorLeftGlobal)
        stop(motorRightGlobal)
    }

    /**
    * The distance length of the motor movement per circle
    */
    //% group="Application functions"
    //% weight=404
    //%block="Set the wheel circumference to %value %unit"
    export function setWheelPerimeter(value: number, unit: Uint): void {
        if (value < 0) {
            value = 0;
        }
        if (unit == Uint.inch) {
            degreeToDistance = value * 2.54
        } else {
            degreeToDistance = value
        }
    }

    //% group="Application functions"
    //% weight=403
    //%block="Combination Motor Move at %speed to %direction %value %uint "
    //% speed.min=0  speed.max=100
    //% inlineInputMode=inline
    export function comboMove(speed: number, direction: VerticallDirection, value: number, uint: DistanceAndAngleUnit): void {
        if (speed <= 0) {
            return;
        }
        setServoSpeed(speed)
        let mode;
        switch (uint) {
            case DistanceAndAngleUnit.Circle:
                mode = SportsMode.Circle;
                break;
            case DistanceAndAngleUnit.Degree:
                mode = SportsMode.Degree;
                break;
            case DistanceAndAngleUnit.Second:
                mode = SportsMode.Second;
                break;
            case DistanceAndAngleUnit.cm:
                value = 360 * value / degreeToDistance
                mode = SportsMode.Degree;
                break;
            case DistanceAndAngleUnit.inch:
                value = 360 * value * 2.54 / degreeToDistance
                mode = SportsMode.Degree;
                break;
        }
        if (direction == VerticallDirection.Up) {
            __move(motorLeftGlobal, MovementDirection.CCW, value, mode)
            __move(motorRightGlobal, MovementDirection.CW, value, mode)
        }
        else {
            __move(motorLeftGlobal, MovementDirection.CW, value, mode)
            __move(motorRightGlobal, MovementDirection.CCW, value, mode)
        }
        motorDelay(value, mode);
    }
    //% group="Application functions"
    //% weight=402
    //%block="set the left wheel speed at %speed_l \\%, right wheel speed at %speed_r \\% and start the motor"
    //% speed_l.min=-100  speed_l.max=100 speed_r.min=-100  speed_r.max=100
    export function comboStart(
        speed_l: number,
        speed_r: number,
    ): void {
        // 计算方向参数（使用虚拟方向，实际方向由速度正负决定）
        const direction = VerticallDirection.Up;

        // 调用通用加速度函数
        accelerateMotors(
            motorLeftGlobal,
            motorRightGlobal,
            // 左电机目标速度（注意：左电机需要反向）
            Math.abs(speed_l),
            // 右电机目标速度
            Math.abs(speed_r),
            direction, // 虚拟方向（实际方向由速度正负控制）
            accelerationProfileGlobal
        );

        // 设置电机方向
        __start(motorLeftGlobal, speed_l > 0 ? MovementDirection.CW : MovementDirection.CCW, Math.abs(speed_l));
        __start(motorRightGlobal, speed_r > 0 ? MovementDirection.CW : MovementDirection.CCW, Math.abs(speed_r));
    }

    //% group="Application functions"
    //% weight=403
    //%block="Combination Motor Move at %speed to %direction %value %uint "
    //% speed.min=0  speed.max=100
    //% inlineInputMode=inline
    export function move1(speed: number, direction: VerticallDirection, value: number, uint: DistanceAndAngleUnit): void {
        let accelerationProfile = accelerationProfileGlobal;

        // 修复类型检查问题：使用 switch 语句处理所有单位类型
        switch (uint) {
            case DistanceAndAngleUnit.Second:
                // 计算目标角度 = 速度 × 时间 × 转换系数
                // 假设：速度100对应360度/秒（根据实际电机特性调整）
                const degreesPerSecond = speed * 3.6; // 100对应360度/秒
                const targetDegrees = degreesPerSecond * value;

                control_motor(
                    targetDegrees,
                    accelerationProfile,
                    motorLeftGlobal,
                    motorRightGlobal,
                    direction,
                    value * 1000 // 将秒转换为毫秒作为最大时间限制
                );
                break;

            default:
                if (accelerationProfile === AccelerationProfile.None) {
                    nezhaV2.comboMove(speed, direction, value, uint);
                } else {
                    let convertedValue = value;
                    // 处理单位转换
                    switch (uint) {
                        case DistanceAndAngleUnit.Circle:
                            // 圈数转换为角度：1圈=360度
                            convertedValue = value * 360;
                            break;
                        case DistanceAndAngleUnit.Degree:
                            // 角度单位无需转换
                            break;
                        case DistanceAndAngleUnit.cm:
                            convertedValue = 360 * value / degreeToDistance;
                            break;
                        case DistanceAndAngleUnit.inch:
                            convertedValue = 360 * value * 2.54 / degreeToDistance;
                            break;
                        // 不再处理Second情况，已在上面单独处理
                    }

                    control_motor(
                        convertedValue,
                        accelerationProfile,
                        motorLeftGlobal,
                        motorRightGlobal,
                        direction
                    );
                }
                break;
        }
    }

    function control_motor(
        target_distance_degrees: number,
        accelerationProfile: number,
        leftMotor: nezhaV2.MotorPostion = nezhaV2.MotorPostion.M1,
        rightMotor: nezhaV2.MotorPostion = nezhaV2.MotorPostion.M2,
        direction: VerticallDirection,
        maxTimeMs: number = 0 // 新增最大时间参数(毫秒)
    ) {
        // === Acceleration profile configuration ===
        const ACCELERATION_PROFILES = [
            { // Profile 1: Slow (optimized parameters)
                KP: 0.15, KI: 0.004, KD: 0.2,
                accelerationRate: 4, decelerationRate: 1.5,
                maxAdjustment: 1.2, minAdjustment: 0.7,
                minSpeed: 15, initialSpeed: 15,
                decelStart: 0.8, finalDecelStart: 0.95,
                maxSpeed: 40
            },
            { // Profile 2: Medium
                KP: 0.18, KI: 0.005, KD: 0.15,
                accelerationRate: 6, decelerationRate: 2,
                maxAdjustment: 1.5, minAdjustment: 0.6,
                minSpeed: 20, initialSpeed: 25,
                decelStart: 0.7, finalDecelStart: 0.9,
                maxSpeed: 60
            },
            { // Profile 3: Fast
                KP: 0.2, KI: 0.006, KD: 0.1,
                accelerationRate: 8, decelerationRate: 3,
                maxAdjustment: 1.8, minAdjustment: 0.5,
                minSpeed: 25, initialSpeed: 35,
                decelStart: 0.6, finalDecelStart: 0.85,
                maxSpeed: 80
            }
        ];

        // Select acceleration profile
        const profile = ACCELERATION_PROFILES[accelerationProfile - 1] || ACCELERATION_PROFILES[0];

        // === Use selected profile parameters ===
        const {
            KP, KI, KD,
            accelerationRate: ACCELERATION_RATE,
            decelerationRate: DECELERATION_RATE,
            maxAdjustment: MAX_ADJUSTMENT,
            minAdjustment: MIN_ADJUSTMENT,
            minSpeed: MIN_SPEED,
            initialSpeed,
            decelStart,
            finalDecelStart,
            maxSpeed
        } = profile;

        // === Other parameters ===
        const SMOOTHING_FACTOR = 0.25;
        const CONTROL_INTERVAL = 10;

        // === Variable initialization ===
        let currentSpeed = initialSpeed;
        let errorIntegral = 0;
        let lastError = 0;
        let correction = 0;
        let positionHistory: { left: number, right: number }[] = [];
        const MAX_HISTORY = 5;

        // === Record starting positions BEFORE starting motors ===
        const startLeft = nezhaV2.readRelAngle(leftMotor);
        const startRight = nezhaV2.readRelAngle(rightMotor);

        // === Motor initialization ===
        if (direction == VerticallDirection.Up) {
            // Up: 左正转，右反转
            nezhaV2.start(leftMotor, currentSpeed);
            nezhaV2.start(rightMotor, -currentSpeed);
        } else {
            // Down: 左反转，右正转
            nezhaV2.start(leftMotor, -currentSpeed);
            nezhaV2.start(rightMotor, currentSpeed);
        }

        let lastLeft = 0;
        let lastRight = 0;
        let filteredRatio = 1;

        // === 新增时间控制变量 ===
        const startTime = input.runningTime();
        let timeLimitExceeded = false;

        // === Main control loop ===
        while (true) {
            basic.pause(CONTROL_INTERVAL);

            // === 检查时间限制（如果设置了maxTimeMs） ===
            if (maxTimeMs > 0 && input.runningTime() - startTime > maxTimeMs) {
                timeLimitExceeded = true;
            }

            // === Read current positions - 始终使用原始读数 ===
            const rawLeft = nezhaV2.readRelAngle(leftMotor);
            const rawRight = nezhaV2.readRelAngle(rightMotor);

            // 计算相对于起始位置的变化量
            // 关键点：根据方向正确处理位移符号
            const currentLeft = (direction === VerticallDirection.Up)
                ? (rawLeft - startLeft)       // Up: 左正转 -> 位移增加
                : (startLeft - rawLeft);      // Down: 左反转 -> 位移增加（startLeft - rawLeft）

            const currentRight = (direction === VerticallDirection.Up)
                ? (startRight - rawRight)     // Up: 右反转 -> 位移增加（startRight - rawRight）
                : (rawRight - startRight);     // Down: 右正转 -> 位移增加

            // === Update position history ===
            positionHistory.push({ left: currentLeft, right: currentRight });
            if (positionHistory.length > MAX_HISTORY) {
                positionHistory.shift();
            }

            // === Stop condition ===
            const leftDistance = currentLeft;  // 由于已经处理过符号，可以直接使用
            const rightDistance = currentRight; // 同上

            // 使用平均距离作为停止条件更合理
            const avgDistance = (leftDistance + rightDistance) / 2;

            // 停止条件：达到目标距离或超时
            if (avgDistance >= target_distance_degrees || timeLimitExceeded) {
                nezhaV2.stop(leftMotor);
                nezhaV2.stop(rightMotor);
                break;
            }

            // === PID controller calculation ===
            const positionError = leftDistance - rightDistance;
            const P = positionError * KP;

            errorIntegral += positionError;
            errorIntegral = Math.max(-1000, Math.min(1000, errorIntegral));
            const I = errorIntegral * KI;

            const D = (positionError - lastError) * KD;
            lastError = positionError;

            correction = P + I + D;

            // === Dynamic differential control ===
            const leftDiff = Math.max(Math.abs(currentLeft - lastLeft), 0.1);
            const rightDiff = Math.max(Math.abs(currentRight - lastRight), 0.1);

            const rawRatio = leftDiff / rightDiff + correction * 0.05;
            filteredRatio = SMOOTHING_FACTOR * rawRatio + (1 - SMOOTHING_FACTOR) * filteredRatio;

            let leftAdjustment = 1;
            let rightAdjustment = 1;

            if (filteredRatio < 1) {
                leftAdjustment = Math.min(1.0 + (1 - filteredRatio) * 0.8, MAX_ADJUSTMENT);
                rightAdjustment = Math.max(1.0 - (1 - filteredRatio) * 0.4, MIN_ADJUSTMENT);
            } else {
                rightAdjustment = Math.min(1.0 + (filteredRatio - 1) * 0.8, MAX_ADJUSTMENT);
                leftAdjustment = Math.max(1.0 - (filteredRatio - 1) * 0.4, MIN_ADJUSTMENT);
            }

            // === Speed control ===
            const maxPosition = Math.max(leftDistance, rightDistance);
            const progress = maxPosition / target_distance_degrees;

            let targetSpeed = currentSpeed;
            if (progress < decelStart) {
                // Acceleration phase
                targetSpeed = Math.min(maxSpeed, currentSpeed + ACCELERATION_RATE);
            } else if (progress < finalDecelStart) {
                // First deceleration phase
                const slowdownFactor = 1.0 - (progress - decelStart) / (finalDecelStart - decelStart) * 0.7;
                targetSpeed = Math.max(MIN_SPEED, initialSpeed * slowdownFactor);
            } else {
                // Final slowdown phase
                const slowdownFactor = 1.0 - (progress - finalDecelStart) / (1 - finalDecelStart);
                targetSpeed = MIN_SPEED + (initialSpeed - MIN_SPEED) * slowdownFactor;
            }

            // Apply speed smoothing
            currentSpeed = targetSpeed * 0.8 + currentSpeed * 0.2;

            // === Apply adjustment factors ===
            // 不需要使用sign变量，直接在速度设置中处理方向
            if (direction == VerticallDirection.Up) {
                // Up: 左正转，右反转
                nezhaV2.start(leftMotor, currentSpeed * leftAdjustment);
                nezhaV2.start(rightMotor, -currentSpeed * rightAdjustment);
            } else {
                // Down: 左反转，右正转
                nezhaV2.start(leftMotor, -currentSpeed * leftAdjustment);
                nezhaV2.start(rightMotor, currentSpeed * rightAdjustment);
            }

            // === Update position records ===
            lastLeft = currentLeft;
            lastRight = currentRight;
        }
    }

    // //% group="Application functions"
    // //% weight=403
    // //%block="Combination Motor Move at %speed to %direction %value %uint "
    // //% speed.min=0  speed.max=100
    // //% inlineInputMode=inline
    // export function _control_motor_timed(speed: number, direction: VerticallDirection, value: number, uint: TimeUnit
    // ): void {

    // }
    // function control_motor_timed(
    //     duration_ms: number, // 运行总时间（毫秒）
    //     accelerationProfile: number,
    //     leftMotor: nezhaV2.MotorPostion = nezhaV2.MotorPostion.M1,
    //     rightMotor: nezhaV2.MotorPostion = nezhaV2.MotorPostion.M2,
    //     direction: VerticallDirection,
    //     maxSpeedOverride?: number // 新增：可选的最高速度覆盖参数
    // ) {
    //     // === Acceleration profile configuration ===
    //     const ACCELERATION_PROFILES = [
    //         { // Profile 1: Slow (optimized parameters)
    //             KP: 0.15, KI: 0.004, KD: 0.2,
    //             maxAdjustment: 1.2, minAdjustment: 0.7,
    //             minSpeed: 15, initialSpeed: 15,
    //             decelStart: 0.6, finalDecelStart: 0.8,
    //             maxSpeed: 40
    //         },
    //         { // Profile 2: Medium
    //             KP: 0.18, KI: 0.005, KD: 0.15,
    //             maxAdjustment: 1.5, minAdjustment: 0.6,
    //             minSpeed: 20, initialSpeed: 25,
    //             decelStart: 0.5, finalDecelStart: 0.7,
    //             maxSpeed: 60
    //         },
    //         { // Profile 3: Fast
    //             KP: 0.2, KI: 0.006, KD: 0.1,
    //             maxAdjustment: 1.8, minAdjustment: 0.5,
    //             minSpeed: 25, initialSpeed: 35,
    //             decelStart: 0.4, finalDecelStart: 0.6,
    //             maxSpeed: 80
    //         }
    //     ];

    //     // Select acceleration profile
    //     const profile = ACCELERATION_PROFILES[accelerationProfile - 1] || ACCELERATION_PROFILES[0];

    //     // === Use selected profile parameters ===
    //     const {
    //         KP, KI, KD,
    //         maxAdjustment: MAX_ADJUSTMENT,
    //         minAdjustment: MIN_ADJUSTMENT,
    //         minSpeed: MIN_SPEED,
    //         initialSpeed,
    //         decelStart,
    //         finalDecelStart,
    //         maxSpeed: profileMaxSpeed // 使用临时变量
    //     } = profile;

    //     // 应用外部覆盖的最大速度（如果提供）
    //     const maxSpeed = maxSpeedOverride !== undefined ? maxSpeedOverride : profileMaxSpeed;

    //     // === Other parameters ===
    //     const SMOOTHING_FACTOR = 0.25;
    //     const CONTROL_INTERVAL = 10;

    //     // === Variable initialization ===
    //     let currentSpeed = initialSpeed;
    //     let errorIntegral = 0;
    //     let lastError = 0;
    //     let correction = 0;

    //     // 添加时间控制变量
    //     const startTime = input.runningTime();
    //     let lastLeft = 0;
    //     let lastRight = 0;
    //     let filteredRatio = 1;

    //     // === Record starting positions BEFORE starting motors ===
    //     const startLeftPos = nezhaV2.readRelAngle(leftMotor);
    //     const startRightPos = nezhaV2.readRelAngle(rightMotor);

    //     // === Motor initialization ===
    //     if (direction == VerticallDirection.Up) {
    //         // Up: 左正转，右反转
    //         nezhaV2.start(leftMotor, currentSpeed);
    //         nezhaV2.start(rightMotor, -currentSpeed);
    //     } else {
    //         // Down: 左反转，右正转
    //         nezhaV2.start(leftMotor, -currentSpeed);
    //         nezhaV2.start(rightMotor, currentSpeed);
    //     }

    //     // === Main control loop - time-based ===
    //     while (true) {
    //         basic.pause(CONTROL_INTERVAL);

    //         // === 计算已运行时间 ===
    //         const elapsedTime = input.runningTime() - startTime;

    //         // === 检查是否达到总运行时间 ===
    //         if (elapsedTime >= duration_ms) {
    //             nezhaV2.stop(leftMotor);
    //             nezhaV2.stop(rightMotor);
    //             break;
    //         }

    //         // === 计算时间进度 (0.0 - 1.0) ===
    //         const progress = Math.min(elapsedTime / duration_ms, 1.0);

    //         // === Read current positions - for synchronization ===
    //         const rawLeft = nezhaV2.readRelAngle(leftMotor);
    //         const rawRight = nezhaV2.readRelAngle(rightMotor);

    //         // 计算相对于起始位置的变化量
    //         const currentLeft = (direction === VerticallDirection.Up)
    //             ? (rawLeft - startLeftPos)
    //             : (startLeftPos - rawLeft);

    //         const currentRight = (direction === VerticallDirection.Up)
    //             ? (startRightPos - rawRight)
    //             : (rawRight - startRightPos);

    //         // === PID controller calculation for synchronization ===
    //         const positionError = currentLeft - currentRight;
    //         const P = positionError * KP;

    //         errorIntegral += positionError;
    //         errorIntegral = Math.max(-1000, Math.min(1000, errorIntegral));
    //         const I = errorIntegral * KI;

    //         const D = (positionError - lastError) * KD;
    //         lastError = positionError;

    //         correction = P + I + D;

    //         // === Dynamic differential control ===
    //         const leftDiff = Math.max(Math.abs(currentLeft - lastLeft), 0.1);
    //         const rightDiff = Math.max(Math.abs(currentRight - lastRight), 0.1);

    //         const rawRatio = leftDiff / rightDiff + correction * 0.05;
    //         filteredRatio = SMOOTHING_FACTOR * rawRatio + (1 - SMOOTHING_FACTOR) * filteredRatio;

    //         let leftAdjustment = 1;
    //         let rightAdjustment = 1;

    //         if (filteredRatio < 1) {
    //             leftAdjustment = Math.min(1.0 + (1 - filteredRatio) * 0.8, MAX_ADJUSTMENT);
    //             rightAdjustment = Math.max(1.0 - (1 - filteredRatio) * 0.4, MIN_ADJUSTMENT);
    //         } else {
    //             rightAdjustment = Math.min(1.0 + (filteredRatio - 1) * 0.8, MAX_ADJUSTMENT);
    //             leftAdjustment = Math.max(1.0 - (filteredRatio - 1) * 0.4, MIN_ADJUSTMENT);
    //         }

    //         // === Speed control based on time progress ===
    //         let targetSpeed = currentSpeed;
    //         if (progress < decelStart) {
    //             // Acceleration phase
    //             targetSpeed = Math.min(maxSpeed, currentSpeed + (maxSpeed - initialSpeed) / (decelStart * duration_ms) * CONTROL_INTERVAL);
    //         } else if (progress < finalDecelStart) {
    //             // First deceleration phase
    //             const slowdownFactor = 1.0 - (progress - decelStart) / (finalDecelStart - decelStart) * 0.7;
    //             targetSpeed = Math.max(MIN_SPEED, initialSpeed * slowdownFactor);
    //         } else {
    //             // Final slowdown phase
    //             const slowdownFactor = 1.0 - (progress - finalDecelStart) / (1 - finalDecelStart);
    //             targetSpeed = MIN_SPEED + (initialSpeed - MIN_SPEED) * slowdownFactor;
    //         }

    //         // Apply speed smoothing
    //         currentSpeed = targetSpeed * 0.8 + currentSpeed * 0.2;

    //         // === Apply adjustment factors ===
    //         if (direction == VerticallDirection.Up) {
    //             // Up: 左正转，右反转
    //             nezhaV2.start(leftMotor, currentSpeed * leftAdjustment);
    //             nezhaV2.start(rightMotor, -currentSpeed * rightAdjustment);
    //         } else {
    //             // Down: 左反转，右正转
    //             nezhaV2.start(leftMotor, -currentSpeed * leftAdjustment);
    //             nezhaV2.start(rightMotor, currentSpeed * rightAdjustment);
    //         }

    //         // === Update position records for differential control ===
    //         lastLeft = currentLeft;
    //         lastRight = currentRight;
    //     }
    // }
    //% group="export functions"
    //% weight=320
    //%block="version number"
    export function readVersion(): string {
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = 0x00;
        buf[3] = 0x00;
        buf[4] = 0x88;
        buf[5] = 0x00;
        buf[6] = 0x00;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        let version = pins.i2cReadBuffer(i2cAddr, 3);
        return `V ${version[0]}.${version[1]}.${version[2]}`;
    }
}
