export namespace registrar {
	
	export class AllowlistEntryRow {
	    activationHash: string;
	    studentIdHash: string;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new AllowlistEntryRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.activationHash = source["activationHash"];
	        this.studentIdHash = source["studentIdHash"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class IssuerInfo {
	    id: string;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new IssuerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	    }
	}
	export class AllowlistView {
	    schema: string;
	    issuer: IssuerInfo;
	    updatedAt: string;
	    entries: AllowlistEntryRow[];
	
	    static createFrom(source: any = {}) {
	        return new AllowlistView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.issuer = this.convertValues(source["issuer"], IssuerInfo);
	        this.updatedAt = source["updatedAt"];
	        this.entries = this.convertValues(source["entries"], AllowlistEntryRow);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IssuanceEntry {
	    student_id: string;
	    student_id_hash: string;
	    name: string;
	    normalized_name: string;
	    birthdate: string;
	    salt: string;
	    activation_hash: string;
	    created_at: string;
	    allowlist_index: number;
	    allowlist_version: number;
	
	    static createFrom(source: any = {}) {
	        return new IssuanceEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.student_id = source["student_id"];
	        this.student_id_hash = source["student_id_hash"];
	        this.name = source["name"];
	        this.normalized_name = source["normalized_name"];
	        this.birthdate = source["birthdate"];
	        this.salt = source["salt"];
	        this.activation_hash = source["activation_hash"];
	        this.created_at = source["created_at"];
	        this.allowlist_index = source["allowlist_index"];
	        this.allowlist_version = source["allowlist_version"];
	    }
	}
	
	export class RegistrationResult {
	    studentId: string;
	    studentIdHash: string;
	    activationHash: string;
	    salt: string;
	    displayName: string;
	    normalizedName: string;
	    normalizedBirthdate: string;
	    allowlistEntryIndex: number;
	    allowlistTotalLength: number;
	    issuedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new RegistrationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.studentId = source["studentId"];
	        this.studentIdHash = source["studentIdHash"];
	        this.activationHash = source["activationHash"];
	        this.salt = source["salt"];
	        this.displayName = source["displayName"];
	        this.normalizedName = source["normalizedName"];
	        this.normalizedBirthdate = source["normalizedBirthdate"];
	        this.allowlistEntryIndex = source["allowlistEntryIndex"];
	        this.allowlistTotalLength = source["allowlistTotalLength"];
	        this.issuedAt = source["issuedAt"];
	    }
	}
	export class StudentInput {
	    studentId: string;
	    name: string;
	    birthdate: string;
	    salt?: string;
	    activationHash?: string;
	    issuedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new StudentInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.studentId = source["studentId"];
	        this.name = source["name"];
	        this.birthdate = source["birthdate"];
	        this.salt = source["salt"];
	        this.activationHash = source["activationHash"];
	        this.issuedAt = source["issuedAt"];
	    }
	}

}

