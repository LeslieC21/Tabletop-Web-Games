import { ComponentRef, Injectable, Type, ViewContainerRef } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private rootViewContainerRef?: ViewContainerRef;
    private currentModalRef?: ComponentRef<any>;

    registerContainer(vcr: ViewContainerRef) {
        this.rootViewContainerRef = vcr;
    }

    open<T>(component: Type<T>, data?: any): ComponentRef<T> {
        if (!this.rootViewContainerRef) {
            throw new Error('ModalService: Root view container not registered.')
        }

        this.close();

        this.currentModalRef = this.rootViewContainerRef.createComponent(component);

        if(data && 'modalMessage' in this.currentModalRef.instance) {
            console.log(data);
            this.currentModalRef.instance.modalMessage = data;
        }

        return this.currentModalRef;
    }

    close() {
        if (this.currentModalRef) {
            this.currentModalRef.destroy();
            this.currentModalRef = undefined;
        }
    }
}