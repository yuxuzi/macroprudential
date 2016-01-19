

library(shiny)
library('xlsx')
library(plotly)
library(evd)
library(xts)
library(reshape2)
source("gev.R")
source("SystemCCA.R")

options(java.parameters = "-Xmx8000m")


Plot<-function(ts)
{
  if(!is.null(ts)){
     if(ncol(ts)>1){
      dd<-melt(ts,id="date")
      plot_ly(dd,x = date,y=value, group=variable)  
       
     }

  }
   

}




shinyServer(function(input, output) {
   
   ## Load Data
   GetData<-reactive({
       if(is.null(input$File))return(NULL)
        dat=read.xlsx(input$File$datapath,"Put Options")
        dates=as.Date(dat[,1])
        dat<-as.xts(dat[,-1],order.by = dates)
        
     
   })
   
   
   
   
  
  output$offset<-renderText({
    dat<-GetData()
    text="Start from"
    if(!is.null(dat) ){
      dt=index(dat)[input$start]
      text=paste(text,  format(dt,"%b%d,%Y"))
    }
    
    text
    
  })
    
    
    

  
   dataInput<-reactive({
     dat<-GetData()
     if(is.null(dat))return(NULL)
     if(nrow(dat)<1|ncol(dat)<2) return(NULL)
     DAT<-LoopMax(dat,input$start,input$Ex_Window )
    
   })
  
  Records<-eventReactive(input$submit,{
   
 
    DAT=dataInput()
    if(is.null(DAT))return(NULL)
    Calculate(DAT,input$window,input$step)

    
   })
   

  tb_VaR<-reactive({
    rec= Records()
    if(!is.null(rec))
    Report_VaR(rec,as.numeric(input$VaR_a))
    
  })
 tb_ES<-reactive({
   rec= Records()
   if(!is.null(rec))
   Report_ES(rec,as.numeric(input$ES_a))
   
 })

   

   output$tbParm <- renderDataTable({

     rec= Records()
     if(!is.null(rec))
     Report_Margin(rec)
     
     
   })
   
   output$tbVaR <- renderDataTable({
     
    tb_VaR()
     
     
   })
   
   output$tbES <- renderDataTable({
     
     tb_ES()
     
   })
   
   output$VaRPlot <- renderPlotly({
     Plot(tb_VaR())
   })
   output$ESPlot <- renderPlotly({
     Plot(tb_ES())
   })
   
})