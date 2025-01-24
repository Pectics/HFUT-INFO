// Dependencies
import config from "@/config";
import { ParamError, UpstreamError } from "@/lib/errors";

// Configs
const host = 'https://userapi.qiekj.com/appointNew/near/newMachines';
const headers = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Content-Length': '', // Fill this in later
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.70 Mobile Safari/537.36',
};
const body = {
    'pageSize': '999999',
    'shopId': '', // Fill this in later
    'machineTypeId': '00',
    'orgId': '0',
    'token': config.LAUNDRY_QIEKJ_TOKEN,
};
const room_no_regex = /([一二三四五六七八九十]|十[一二]|[1-9]|1[0-2])[号栋幢]/i;
const room_machine_no_regex = /([一二三四五六七八九十]|[一二三]?十[一二三四五六七八九]?|\d+)号/i;
const floor_machine_pos_regex = /([东南西北])楼?([一二三四五六七八九]|[1-9])楼?/i;
const floor_machine_dir_regex = /([左右东南西北A-Z])/i;
const cache = {
    last_update: 0,
    laundries: new Map<number, Laundry>(),
};

// Utility functions
const parse_num = (str: string) => {
    const num = parseInt(str);
    if (isNaN(num)) return {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16, '十七': 17,
        '十八': 18, '十九': 19, '一十': 10, '一十一': 11, '一十二': 12, '一十三': 13, '一十四': 14,
        '一十五': 15, '一十六': 16, '一十七': 17, '一十八': 18, '一十九': 19, '二十': 20, '二十一': 21,
        '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25, '二十六': 26, '二十七': 27, '二十八': 28,
        '二十九': 29, '三十': 30, '三十一': 31, '三十二': 32, '三十三': 33, '三十四': 34, '三十五': 35,
        '三十六': 36, '三十七': 37, '三十八': 38, '三十九': 39,
    }[str] || -1;
    return num;
}
const parse_char = (num: number) => {
    if (num < 0) return 'null';
    if (num < 10) return '零一二三四五六七八九'[num];
    if (num < 20) return `十${'一二三四五六七八九'[num - 10]}`;
    if (num < 30) return `二十${'一二三四五六七八九'[num - 20]}`;
    return 'null';
}

// Type definitions
export type MachineRaw = {
    goodsId: number;
    goodsName: string;
    deviceWorkStatus: number;
    isReserved: number;
    endUseTimeValue: string;
};
export type Machine = {
    id: number;
    name: string;
    type: 11 | 12 | 21 | 22; // 10: WASHER, 20: DRYER, 1: CLOTHES, 2: SHOES
    available: boolean;
    time_left: string | undefined;
};
export type Laundry = {
    id: number;
    type: 1 | 2; // 1: ROOM, 2: FLOOR
    name: string;
    machines: Machine[];
};

/**
 * Fetches the list of machines for a given laundry code.
 * 
 * @param code - The laundry code to fetch machines for.
 * @returns A promise that resolves to an array of MachineRaw objects.
 * @throws {UpstreamError} If the response data is invalid.
 */
async function fetch_machines(code: string): Promise<MachineRaw[]> {
    body.shopId = code;
    const body_str = new URLSearchParams(body).toString();
    headers['Content-Length'] = body_str.length.toString();
    const res = await fetch(host, { method: 'POST', headers, body: body_str });
    const data = await res.json();
    if (!data?.data?.items)
        throw new UpstreamError(`Invalid response data to get machines of laundry(${code}): ${JSON.stringify(data)}`);
    return data.data.items;
}

/**
 * Adds a suffix to the machine name based on its type.
 * 
 * @param machine - The machine to add a suffix to.
 * @param abbreviate - Whether to abbreviate the machine name.
 */
function suffix_machine(machine: Machine, abbreviate: boolean) {
    switch (Math.trunc(machine.type / 10)) {
        case 1: // WASHER
            switch (machine.type % 10) {
                case 1: // CLOTHES
                    if (!abbreviate) machine.name += '洗衣';
                    machine.name += '机';
                    break;
                case 2: // SHOES
                    machine.id += 100 - machine.id % 100 * 2;
                    machine.name += '洗鞋机';
                    break;
            }
            break;
        case 2: // DRYER
            machine.name += '烘干机';
            break;
    }
}

/**
 * Classifies machines by laundry room and returns an array of Laundry objects.
 * 
 * @param raws - The raw machine data to classify.
 * @returns An array of Laundry objects classified by room.
 */
function room_machines(raws: MachineRaw[]): Laundry[] {
    // Classify machines by laundry
    const laundry_rooms = new Map<number, Laundry>();
    for (const raw of raws) {
        let _name = raw.goodsName;

        // Parse machine
        const machine = {
            id: 0, // Fill this in later
            name: 'null', // Fill this in later
            type: (+_name.includes('烘') + 1) * 10 + (+_name.includes('鞋') + 1),
            available: raw.deviceWorkStatus === 10,
            time_left: raw.endUseTimeValue || undefined,
        } as Machine;

        // Get room No. and machine No.
        const room_no_exec = room_no_regex.exec(_name);
        let room_no = 0;
        if (room_no_exec && room_no_exec[1]) {
            room_no = parse_num(room_no_exec[1]);
            _name = _name.replace(room_no_exec[0], '');
        }
        const machine_no_exec = room_machine_no_regex.exec(_name);
        let machine_no = 0;
        if (machine_no_exec && machine_no_exec[1]) {
            machine_no = parse_num(machine_no_exec[1]);
            _name = _name.replace(machine_no_exec[0], '');
        }

        // Fill in machine id and name
        machine.id = 1000000 + room_no * 10000 + machine_no;
        machine.name = `${room_no}号楼洗衣房`;
        machine.name += machine_no ? `${machine_no}号` : '';
        suffix_machine(machine, !!machine_no);

        // Find or create laundry, then push machine
        const laundry = laundry_rooms.get(room_no);
        if (laundry) laundry.machines.push(machine);
        else laundry_rooms.set(room_no, {
            id: 100 + room_no,
            type: 1, // ROOM
            name: `${room_no}号楼洗衣房`,
            machines: [machine],
        } as Laundry);
    }
    return Array.from(laundry_rooms.values());
}

/**
 * Classifies machines by laundry floor and returns an array of Laundry objects.
 * 
 * @param raws - The raw machine data to classify.
 * @returns An array of Laundry objects classified by floor.
 */
function floor_machines(raws: MachineRaw[]): Laundry[] {
    // Classify machines by laundry
    const laundry_floors = new Map<number, Laundry>();
    for (const raw of raws) {
        let _name = raw.goodsName;

        // Parse machine
        const machine = {
            id: 0, // Fill this in later
            name: 'null', // Fill this in later
            type: (+_name.includes('烘') + 1) * 10 + (+_name.includes('鞋') + 1),
            available: raw.deviceWorkStatus === 10,
            time_left: raw.endUseTimeValue || undefined,
        } as Machine;

        // Get room No, machine position and direction
        const room_no_exec = room_no_regex.exec(_name);
        let room_no = 0;
        if (room_no_exec && room_no_exec[1]) {
            room_no = parse_num(room_no_exec[1]);
            _name = _name.replace(room_no_exec[0], '');
        }
        const machine_pos_exec = floor_machine_pos_regex.exec(_name);
        let machine_part = '';
        let machine_floor = 0;
        if (machine_pos_exec) {
            if (machine_pos_exec[1]) machine_part = machine_pos_exec[1];
            if (machine_pos_exec[2]) machine_floor = parse_num(machine_pos_exec[2]);
            _name = _name.replace(machine_pos_exec[0], '');
        }
        const machine_dir_exec = floor_machine_dir_regex.exec(_name);
        let machine_dir = '';
        if (machine_dir_exec && machine_dir_exec[1]) {
            machine_dir = machine_dir_exec[1];
            _name = _name.replace(machine_dir_exec[0], '');
        }

        // Fill in machine id and name
        machine.id = 2000000 + room_no * 10000 + "南北".indexOf(machine_part[0]) * 1000 + machine_floor * 100;
        machine.name = `${room_no}号${machine_part}楼${parse_char(machine_floor)}层${machine_dir}`
        if ("左右东南西北".includes(machine_dir[0])) {
            machine.id += "左右东南西北".indexOf(machine_dir[0]) + 1;
            machine.name += '侧';
        } else if (machine_dir) {
            machine.id += machine_dir.charCodeAt(0) - 64;
            machine.name += '号';
        } else machine.id += 1;
        suffix_machine(machine, !!machine_dir);

        // Find or create laundry, then push machine
        const laundry = laundry_floors.get(room_no);
        if (laundry) laundry.machines.push(machine);
        else laundry_floors.set(room_no, {
            id: 200 + room_no,
            type: 2, // FLOOR
            name: `${room_no}号楼楼层机`,
            machines: [machine],
        } as Laundry);
    }
    return Array.from(laundry_floors.values());
}

/**
 * Updates the cache with the latest laundry machine data.
 */
function update() {
    const last_update = Date.now();
    const laundries = new Map<number, Laundry>();
    let _records = 0;

    // Fetch and process rooms machines
    config.LAUNDRY_CODES.rooms.forEach(code => fetch_machines(code)
        .then(raws => {
            room_machines(raws)
                .forEach(laundry => laundries.set(laundry.id, laundry));
            if (++_records >= 2) {
                cache.last_update = last_update;
                cache.laundries = laundries;
            }
        }));

    // Fetch and process floors machines
    config.LAUNDRY_CODES.floors.forEach(code => fetch_machines(code)
        .then(raws => {
            floor_machines(raws)
                .forEach(laundry => laundries.set(laundry.id, laundry));
            if (++_records >= 2) {
                cache.last_update = last_update;
                cache.laundries = laundries;
            }
        }));
}

/**
 * Retrieves a list of laundries with basic information.
 *
 * @returns {Array<{id: number, type: 1 | 2, name: string}>} 
 *          An array of laundry objects containing basic information:
 *          - `id`: The laundry ID.
 *          - `type`: The type of laundry (1 for ROOM, 2 for FLOOR).
 *          - `name`: The name of the laundry.
 */
export function laundries(): Array<{ id: number; type: 1 | 2; name: string; }> {
    if (Date.now() - cache.last_update > config.LAUNDRY_UPDATE_INTERVAL * 1000) update();
    const laundries = [] as Omit<Laundry, 'machines'>[];
    for (const laundry of cache.laundries.values())
        laundries.push({ id: laundry.id, type: laundry.type, name: laundry.name });
    laundries.sort((a, b) => a.id - b.id);
    return laundries;
}

/**
 * Retrieves detailed information about a specific laundry by its ID.
 *
 * @param {number} id - The ID of the laundry to retrieve.
 * @returns {Laundry} The laundry object containing detailed information:
 *          - `id`: The laundry ID.
 *          - `type`: The type of laundry (1 for ROOM, 2 for FLOOR).
 *          - `name`: The name of the laundry.
 *          - `machines`: An array of machines in the laundry:
 *          -   - `id`: The machine ID.
 *          -   - `name`: The machine name.
 *          -   - `type`: The machine type (11 or 12 for WASHER, 21 or 22 for DRYER).
 *          -   - `available`: Whether the machine is available.
 *          -   - `time_left?`: The remaining time for the machine to be available (if applicable).
 * @throws {ParamError} If the provided ID is invalid or the laundry is not found.
 */
export function laundry(id: number): Laundry {
    if (Date.now() - cache.last_update > config.LAUNDRY_UPDATE_INTERVAL * 1000) update();
    const laundry = cache.laundries.get(id);
    if (!laundry) throw new ParamError('id', id);
    return laundry;
}

