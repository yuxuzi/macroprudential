

library(shiny)
library('xlsx')
library(plotly)
library(evd)
library(xts)
library(reshape2)
library(shinyBS)
source("gev.R")
source("SystemCCA.R")

options(java.parameters = "-Xmx8000m")


Plot<-function(ts,log=FALSE)
{
  if(!is.null(ts)){
     if(ncol(ts)>1){
      dd<-melt(ts,id="Date")
      
      if(log){
         plot_ly(dd,x = Date,y=value, group=variable) %>%
        layout(yaxis = list(type = "log"))
      }else{
        
        plot_ly(dd,x = Date,y=value, group=variable)
        
      }
      
      
      
       
     }

  }
   

}

Sys.setenv("plotly_username" = "systemcca")
Sys.setenv("plotly_api_key" = "awvpjxrjnc")




shinyServer(function(input, output, clientData, session) {
  
   GetData<-reactive({
  
       if(is.null(input$File))return(NULL)
        dat=read.xlsx(input$File$datapath,"Put Options")
        dates=as.Date(dat[,1])
        updateSelectInput(session,"start", choices = format(dates,"%b %d, %Y"))
        dat<-as.xts(dat[,-1],order.by = dates)
     
     
   })
   
     observe({ dat<-GetData()})
   
   
  

    

   
    
  
   
    

  
   dataInput<-reactive({
     dat<-GetData()
     if(is.null(dat))return(NULL)
     if(nrow(dat)<1|ncol(dat)<2) return(NULL)
     startDate=as.Date(input$start,"%b %d, %Y")
     DAT<-LoopMax(dat[paste0(startDate,"/")],1,input$Ex_Window )
    
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

 tb_Parm<-reactive({
   rec= Records()
   if(!is.null(rec))
     Report_Margin(rec)
   
 })
 
 pl_VaR<-reactive({
   
   Plot(tb_VaR(),input$logscale)
   
 })
 pl_ES<-reactive({
   
   Plot(tb_ES(),input$logscale)
  
   
 })
   
   
   output$tbVaR <- renderDataTable({
     
    tb_VaR()
     
     
   })
   
   
   
   
   output$tbES <- renderDataTable({
     
     tb_ES()
     
   })
   
   
   output$tbParm <- renderDataTable({
     
     tb_Parm()
     
     
   })
   
   
   
   
   
   output$VaRPlot <- renderPlotly({
     pl_VaR()
   })
   output$ESPlot <- renderPlotly({
     pl_ES()
   })
   
   
   
   
   
   
   output$downloadData <- downloadHandler(
     filename =function(){"SystemicCCA.xlsx"},
     content = function(file) {
       wb <- createWorkbook()
       addTable<-function(data, sheet_name)
       {
         options(xlsx.date.format=" mm/dd/yyyy")
         sheet <- createSheet(wb, sheetName=sheet_name)
         cs <- CellStyle(wb) + Font(wb, isBold=TRUE) + Border() # header
         addDataFrame(data, sheet,  colnamesStyle=cs,row.names=FALSE)
         setColumnWidth(sheet,colIndex=c(1),colWidth=11)
         
       }
       addPlot<-function(p,sheet_name ){
         pngfile= tempfile(fileext='.png')
         browser()
         sheet <- createSheet(wb, sheetName=sheet_name)  
         plotly_IMAGE(p, width = 1000, height = 800, format = "png",out_file = pngfile)
         addPicture(pngfile,sheet)
         if (file.exists(pngfile)) file.remove(pngfile)
       }
       
       addTable(tb_VaR(),"VaR")
       addPlot(pl_VaR(),"VaR-plot")
       addTable(tb_ES(),"ES")
       addPlot(pl_ES(),"ES-Plot")
       addTable(tb_Parm(),"Parameters")
       saveWorkbook(wb, file)
      
      
     }
   )
   
   addTooltip(session,"tbVaR", "You can sort the results", "top")
   addTooltip(session,"tbES", "You can sort the results", "top") 
   addTooltip(session,"tbParm", "You can sort the results ", "top")
   addPopover(session,"tbParm","Marginal GEV  Parameters", HTML("<ul><li>espsilon - shape parameter</li><li>mu - location parameter</li><li>sigma - scale parameter</li></ul><br>"), "top")
   
   
})